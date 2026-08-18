import { TRPCError } from "@trpc/server";
import z from "zod";

import { normalizePath } from "@workspace/cms-core/utils/file";

import { cmsProcedure, createTRPCRouter } from "../../init";
import {
  resolveBatchCommitMessage,
  resolveCommitIdentity,
} from "../../lib/cms/commit-message";
import { getConfig } from "../../lib/cms/config-store";
import {
  stringifyContentEntry,
  validateContentEntry,
} from "../../lib/cms/content-file";
import { createHttpError, toTRPCError } from "../../lib/cms/errors";
import { requireFeatureAccess } from "../../lib/cms/feature-access";
import {
  commitFilesAtomic,
  type CommitFileInput,
} from "../../lib/cms/git-commit";
import { getManifest } from "../../lib/cms/manifest-store";
import { createOctokitInstance } from "../../lib/cms/octokit";
import { stringify } from "../../lib/cms/serialization";

/**
 * Publish a batch of content entries as a single atomic commit.
 * Ported from POST /api/[owner]/[repo]/[branch]/publish.
 *
 * Uses the Git Data API (createTree → createCommit → updateRef) so all files
 * land in one commit on the working branch (see lib/cms/git-commit.ts).
 * All-or-nothing: any validation failure aborts before anything is committed.
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
  publish: cmsProcedure
    .input(
      z.object({
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
    .mutation(async ({ ctx, input }) => {
      try {
        await requireFeatureAccess(ctx.user, "cms");

        const config = await getConfig(input.owner, input.repo, input.branch, {
          getToken: async () => ctx.token,
        });
        if (!config)
          throw new Error(
            `Configuration not found for ${input.owner}/${input.repo}/${input.branch}.`
          );

        const files = input.files;
        const force = input.force === true;

        // Validate and serialize every file up-front (all-or-nothing).
        const entries: Array<
          CommitFileInput & { name: string; schema: Record<string, any> }
        > = [];
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

        const octokit = createOctokitInstance(ctx.token);

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
          commitIdentity === "user"
            ? ctx.user.name?.trim() || ctx.user.email
            : undefined;

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
          user: ctx.user.email || ctx.user.name || String(ctx.user.id || ""),
          userName: editorName,
        });
        // Appended after the length cap so the editor's name is never truncated away.
        const message = editorName
          ? `${resolvedMessage} — by ${editorName}`
          : resolvedMessage;

        const result = await commitFilesAtomic({
          octokit,
          owner: input.owner,
          repo: input.repo,
          branch: input.branch,
          files: entries,
          message,
          force,
        });

        if (result.status === "conflict") {
          // Result union instead of the REST route's 409: the client shows the
          // diff dialog off this shape, no error handling needed.
          return {
            status: "conflict" as const,
            stalePaths: result.stalePaths,
            conflictPaths: result.conflictPaths,
          };
        }

        return {
          status: "success" as const,
          message: `Published ${entries.length} file(s).`,
          data: {
            commit: { sha: result.commitSha },
            files: result.files,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),

  /**
   * CMS v2 publish: schema-less. Files are the repo's v2 content files
   * (pages.json, site.json, collection markdown). JSON files are serialized
   * exactly like the legacy json branch (`JSON.stringify(obj, null, 2)`, no
   * trailing newline) so a v2 publish never produces a whole-file diff.
   * Markdown files take `{ body, ...frontmatter }` objects and serialize as
   * YAML frontmatter.
   */
  publishV2: cmsProcedure
    .input(
      z.object({
        branch: z.string(),
        files: z
          .array(
            z.object({
              path: z.string().min(1),
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
    .mutation(async ({ ctx, input }) => {
      try {
        await requireFeatureAccess(ctx.user, "cms");

        const manifest = await getManifest(
          input.owner,
          input.repo,
          input.branch,
          { getToken: async () => ctx.token }
        );
        if (!manifest)
          throw createHttpError(
            `No cms.json manifest found for ${input.owner}/${input.repo}/${input.branch}.`,
            404
          );

        // Only the manifest's own files are publishable: pages/site JSON,
        // array-collection files (path ends in ".json"), and directory
        // collection folders (matched by their "path/" prefix).
        const arrayCollectionPaths = new Set(
          manifest.object.collections
            .filter((collection) => collection.path.endsWith(".json"))
            .map((collection) => collection.path)
        );
        const allowedJson = new Set([
          manifest.object.paths.pages,
          manifest.object.paths.variables,
          manifest.object.paths.seo,
          ...arrayCollectionPaths,
        ]);
        const collectionRoots = manifest.object.collections
          .filter((collection) => !collection.path.endsWith(".json"))
          .map((collection) => `${collection.path}/`);

        const entries: CommitFileInput[] = [];
        const seenPaths = new Set<string>();

        for (const file of input.files) {
          const normalizedPath = normalizePath(file.path);
          if (seenPaths.has(normalizedPath))
            throw createHttpError(
              `Duplicate path "${normalizedPath}" in publish request.`,
              400
            );
          seenPaths.add(normalizedPath);

          const inCollection = collectionRoots.some((root) =>
            normalizedPath.startsWith(root)
          );
          if (!allowedJson.has(normalizedPath) && !inCollection)
            throw createHttpError(
              `"${normalizedPath}" is not a CMS-managed file for this repo.`,
              400
            );

          let stringified: string;
          if (normalizedPath.endsWith(".json")) {
            const mustBeArray = arrayCollectionPaths.has(normalizedPath);
            if (mustBeArray) {
              if (!Array.isArray(file.content))
                throw createHttpError(
                  `Content for "${normalizedPath}" must be an array.`,
                  400
                );
            } else if (
              !file.content ||
              typeof file.content !== "object" ||
              Array.isArray(file.content)
            ) {
              throw createHttpError(
                `Content for "${normalizedPath}" must be an object.`,
                400
              );
            }
            stringified = JSON.stringify(file.content, null, 2);
          } else if (
            normalizedPath.endsWith(".md") ||
            normalizedPath.endsWith(".mdx")
          ) {
            if (!file.content || typeof file.content !== "object")
              throw createHttpError(
                `Content for "${normalizedPath}" must be an object with a body.`,
                400
              );
            stringified = stringify(file.content, {
              format: "yaml-frontmatter",
            });
          } else {
            throw createHttpError(
              `Unsupported file type for "${normalizedPath}".`,
              400
            );
          }

          entries.push({
            path: normalizedPath,
            sha: file.sha ?? null,
            isNew: !!file.isNew,
            stringified,
          });
        }

        const octokit = createOctokitInstance(ctx.token);

        const editorName = ctx.user.name?.trim() || ctx.user.email;
        const fileNames = entries
          .map((entry) => entry.path.split("/").pop())
          .join(", ");
        const message = `content: update ${fileNames} — by ${editorName}`;

        const result = await commitFilesAtomic({
          octokit,
          owner: input.owner,
          repo: input.repo,
          branch: input.branch,
          files: entries,
          message,
          force: input.force === true,
        });

        if (result.status === "conflict") {
          return {
            status: "conflict" as const,
            stalePaths: result.stalePaths,
            conflictPaths: result.conflictPaths,
          };
        }

        return {
          status: "success" as const,
          message: `Published ${entries.length} file(s).`,
          data: {
            commit: { sha: result.commitSha },
            files: result.files,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),
});
