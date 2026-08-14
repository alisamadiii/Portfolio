import z from "zod";

import { normalizePath } from "@workspace/cms-core/utils/file";

import { authenticatedProcedure, createTRPCRouter } from "../../init";
import {
  resolveBatchCommitMessage,
  resolveCommitIdentity,
} from "../../lib/cms/commit-message";
import { getConfig } from "../../lib/cms/config-store";
import {
  stringifyContentEntry,
  validateContentEntry,
} from "../../lib/cms/content-file";
import { createHttpError, runCms } from "../../lib/cms/errors";
import { requireFeatureAccess } from "../../lib/cms/feature-access";
import { updateFileCache } from "../../lib/cms/github-cache-file";
import { createOctokitInstance } from "../../lib/cms/octokit";
import { getToken } from "../../lib/cms/token";
import { type User } from "../../lib/cms/types";

/**
 * Publish a batch of content entries as a single atomic commit.
 * Ported from POST /api/[owner]/[repo]/[branch]/publish.
 *
 * Uses the Git Data API (createTree → createCommit → updateRef) so all files
 * land in one commit on the working branch. All-or-nothing: any validation
 * failure aborts before anything is committed.
 *
 * Contract change vs the REST route: the stale/conflict case (formerly a 409
 * with path lists) is returned as a `{ status: "conflict" }` result instead of
 * thrown, so the client can render the diff dialog without error handling.
 * All other errors still throw.
 *
 * Known limitation (intentional): `settings.content.merge` is NOT applied in
 * the publish path — drafts are serialized from the submitted values only,
 * without merging unknown fields from the existing file on GitHub.
 *
 * Content paths are already physical (rebased via the config schema), so they
 * write as-is — no basePath rebasing needed here (settings files never go
 * through publish).
 */

const MAX_FILES = 50;

export const publishRouter = createTRPCRouter({
  publish: authenticatedProcedure
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
        branch: z.string(),
        files: z
          .array(
            z.object({
              path: z.string().min(1),
              name: z.string(),
              content: z.any(),
              sha: z.string().nullable().optional(),
              isNew: z.boolean().optional(),
            })
          )
          .min(1, `"files" must be a non-empty array.`)
          .max(
            MAX_FILES,
            `Cannot publish more than ${MAX_FILES} files at once.`
          ),
        force: z.boolean().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      runCms(async () => {
        const user = ctx.session.user as User;

        await requireFeatureAccess(user, "cms");

        const { token } = await getToken(user, input.owner, input.repo, true);
        if (!token) throw new Error("Token not found");

        const config = await getConfig(input.owner, input.repo, input.branch, {
          getToken: async () => token,
        });
        if (!config)
          throw new Error(
            `Configuration not found for ${input.owner}/${input.repo}/${input.branch}.`
          );

        const files = input.files;
        const force = input.force === true;

        // Validate and serialize every file up-front (all-or-nothing).
        const entries: Array<{
          path: string;
          name: string;
          sha: string | null;
          isNew: boolean;
          stringified: string;
          schema: Record<string, any>;
        }> = [];
        const seenPaths = new Set<string>();

        for (const file of files) {
          const normalizedPath = normalizePath(file.path);
          if (seenPaths.has(normalizedPath))
            throw createHttpError(
              `Duplicate path "${normalizedPath}" in publish request.`,
              400
            );
          seenPaths.add(normalizedPath);

          let validated;
          try {
            validated = validateContentEntry({
              config,
              name: file.name,
              path: normalizedPath,
              content: file.content,
              isCreate: !!file.isNew,
            });
          } catch (error: any) {
            const status =
              typeof error?.status === "number" ? error.status : 400;
            throw createHttpError(
              `Validation failed for "${normalizedPath}": ${error?.message || "unknown error"}`,
              status
            );
          }

          if (validated.mode === "gitkeep")
            throw createHttpError(
              `Cannot publish "${normalizedPath}": publish is for content entries, not folders.`,
              400
            );

          const stringified =
            validated.mode === "serialized"
              ? stringifyContentEntry(validated.schema, validated.contentObject)
              : validated.body;

          entries.push({
            path: normalizedPath,
            name: file.name,
            sha: file.sha ?? null,
            isNew: !!file.isNew,
            stringified,
            schema: validated.schema,
          });
        }

        const octokit = createOctokitInstance(token);

        // Current branch head and its tree.
        const refResponse = await octokit.rest.git.getRef({
          owner: input.owner,
          repo: input.repo,
          ref: `heads/${input.branch}`,
        });
        const headSha = refResponse.data.object.sha;

        const headCommitResponse = await octokit.rest.git.getCommit({
          owner: input.owner,
          repo: input.repo,
          commit_sha: headSha,
        });
        const baseTreeSha = headCommitResponse.data.tree.sha;

        // Conflict check: compare each draft's base sha against the branch tree.
        const stalePaths: string[] = [];
        const conflictPaths: string[] = [];

        const baseTreeResponse = await octokit.rest.git.getTree({
          owner: input.owner,
          repo: input.repo,
          tree_sha: baseTreeSha,
          recursive: "1",
        });

        if (baseTreeResponse.data.truncated) {
          // Tree too large to list — fall back to per-file HEAD sha checks.
          for (const entry of entries) {
            try {
              const response = await octokit.rest.repos.getContent({
                owner: input.owner,
                repo: input.repo,
                path: entry.path,
                ref: input.branch,
              });
              if (Array.isArray(response.data))
                throw new Error(
                  `Expected a file at "${entry.path}" but found a directory.`
                );
              if (entry.isNew) {
                conflictPaths.push(entry.path);
              } else if (response.data.sha !== entry.sha) {
                stalePaths.push(entry.path);
              }
            } catch (error: any) {
              if (error.status === 404) {
                // Missing on GitHub: fine for new files, stale for existing ones.
                if (!entry.isNew) stalePaths.push(entry.path);
              } else {
                throw error;
              }
            }
          }
        } else {
          const blobShaByPath = new Map<string, string>();
          for (const item of baseTreeResponse.data.tree) {
            if (item.type === "blob" && item.path && item.sha)
              blobShaByPath.set(item.path, item.sha);
          }
          for (const entry of entries) {
            const currentSha = blobShaByPath.get(entry.path);
            if (entry.isNew) {
              if (currentSha) conflictPaths.push(entry.path);
            } else if (currentSha !== entry.sha) {
              stalePaths.push(entry.path);
            }
          }
        }

        if ((stalePaths.length > 0 || conflictPaths.length > 0) && !force) {
          // Result union instead of the REST route's 409: the client shows the
          // diff dialog off this shape, no error handling needed.
          return {
            status: "conflict" as const,
            stalePaths,
            conflictPaths,
          };
        }

        // One tree, one commit for all files (inline content — no createBlob).
        const newTreeResponse = await octokit.rest.git.createTree({
          owner: input.owner,
          repo: input.repo,
          base_tree: baseTreeSha,
          tree: entries.map((entry) => ({
            path: entry.path,
            mode: "100644" as const,
            type: "blob" as const,
            content: entry.stringified,
          })),
        });

        // Commits are always authored by the org PAT owner; when the config asks
        // for user identity, the editor's name goes into the commit message instead
        // (stamping user emails as author can block Vercel deploys).
        const commitIdentity = resolveCommitIdentity({
          configObject: config.object,
          identityOverride:
            entries.length === 1
              ? entries[0].schema?.commit?.identity
              : undefined,
        });
        const editorName =
          commitIdentity === "user" ? user.name?.trim() || user.email : undefined;

        const resolvedMessage = resolveBatchCommitMessage({
          configObject: config.object,
          files: entries.map((entry) => ({
            path: entry.path,
            isNew: entry.isNew,
            contentName: entry.name,
          })),
          owner: input.owner,
          repo: input.repo,
          branch: input.branch,
          user: user.email || user.name || String(user.id || ""),
          userName: editorName,
        });
        // Appended after the length cap so the editor's name is never truncated away.
        const message = editorName
          ? `${resolvedMessage} — by ${editorName}`
          : resolvedMessage;

        const newCommitResponse = await octokit.rest.git.createCommit({
          owner: input.owner,
          repo: input.repo,
          message,
          tree: newTreeResponse.data.sha,
          parents: [headSha],
        });
        const newCommitSha = newCommitResponse.data.sha;

        try {
          await octokit.rest.git.updateRef({
            owner: input.owner,
            repo: input.repo,
            ref: `heads/${input.branch}`,
            sha: newCommitSha,
            force: false,
          });
        } catch (error: any) {
          if (error.status === 422) {
            // Branch advanced between getRef and updateRef — drafts stay intact.
            throw createHttpError(
              "Branch was updated while publishing — please retry.",
              409
            );
          }
          throw error;
        }

        // Fetch the new tree to get the blob shas of the published files.
        const publishedTreeResponse = await octokit.rest.git.getTree({
          owner: input.owner,
          repo: input.repo,
          tree_sha: newCommitResponse.data.tree.sha,
          recursive: "1",
        });
        const publishedShaByPath = new Map<
          string,
          { sha: string; size?: number }
        >();
        for (const item of publishedTreeResponse.data.tree) {
          if (item.type === "blob" && item.path && item.sha)
            publishedShaByPath.set(item.path, {
              sha: item.sha,
              size: item.size,
            });
        }

        const commitTimestamp = Date.now();
        const publishedFiles: Array<{ path: string; sha: string }> = [];

        for (const entry of entries) {
          const published = publishedShaByPath.get(entry.path);
          if (!published) continue;
          publishedFiles.push({ path: entry.path, sha: published.sha });

          await updateFileCache(
            "collection",
            input.owner,
            input.repo,
            input.branch,
            {
              type: entry.isNew ? "add" : "modify",
              path: entry.path,
              sha: published.sha,
              content: entry.stringified,
              size: published.size,
              commit: {
                sha: newCommitSha,
                timestamp: commitTimestamp,
              },
            }
          );
        }

        return {
          status: "success" as const,
          message: `Published ${entries.length} file(s).`,
          data: {
            commit: { sha: newCommitSha },
            files: publishedFiles,
          },
        };
      })
    ),
});
