import z from "zod";

import {
  configVersion,
  normalizeConfig,
  parseConfig,
} from "@workspace/cms-core/config";
import { isContentOperationAllowed } from "@workspace/cms-core/operations";
import { getSchemaByName } from "@workspace/cms-core/schema";
import {
  getFileExtension,
  getFileName,
  getParentPath,
  normalizePath,
} from "@workspace/cms-core/utils/file";

import { authenticatedProcedure, createTRPCRouter } from "../../init";
import { assertAdminUser } from "../../lib/cms/authz-shared";
import {
  buildCommitTokens,
  resolveCommitIdentity,
  resolveCommitMessage,
} from "../../lib/cms/commit-message";
import { getConfig, updateConfig } from "../../lib/cms/config-store";
import {
  stringifyContentEntry,
  validateContentEntry,
} from "../../lib/cms/content-file";
import { createHttpError, runCms } from "../../lib/cms/errors";
import { requireFeatureAccess } from "../../lib/cms/feature-access";
import {
  getBranchHeadSha,
  setBranchHeadSha,
  updateFileCache,
} from "../../lib/cms/github-cache-file";
import { createOctokitInstance } from "../../lib/cms/octokit";
import {
  getBasePath,
  rebaseConfigObject,
  resolveConfigFilePath,
} from "../../lib/cms/repo-settings";
import { parse } from "../../lib/cms/serialization";
import { getToken } from "../../lib/cms/token";
import { type User } from "../../lib/cms/types";

/**
 * Create, update, delete and rename individual files in a GitHub repository.
 * Ported from the hub REST routes:
 * - POST/DELETE /api/[owner]/[repo]/[branch]/files/[path]
 * - POST /api/[owner]/[repo]/[branch]/files/[path]/rename
 */

const isPlainObject = (value: unknown): value is Record<string, any> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;

// Deep merge with arrays replaced wholesale (mirrors the hub's
// lodash.mergewith customizer that returned srcValue for arrays).
const mergeContentObjects = (existing: any, incoming: any): any => {
  if (Array.isArray(incoming)) return incoming;
  if (isPlainObject(existing) && isPlainObject(incoming)) {
    const result: Record<string, any> = { ...existing };
    for (const key of Object.keys(incoming)) {
      const srcValue = incoming[key];
      if (srcValue === undefined) continue;
      result[key] = mergeContentObjects(existing[key], srcValue);
    }
    return result;
  }
  return incoming === undefined ? existing : incoming;
};

// Helper function to save a file to GitHub (with retry logic for new files)
const githubSaveFile = async (
  token: string,
  owner: string,
  repo: string,
  branch: string,
  path: string,
  contentBase64: string,
  sha?: string,
  options?: {
    configObject?: Record<string, any>;
    templatesOverride?: Record<string, string>;
    contentName?: string;
    user?: string;
    onConflict?: "rename" | "error";
    editorName?: string;
  }
) => {
  // We disable retries for 409 errors as it means the file has changed (conflict on SHA)
  const octokit = createOctokitInstance(token, {
    retry: { doNotRetry: [409] },
  });

  const resolvedMessage = resolveCommitMessage({
    configObject: options?.configObject,
    templatesOverride: options?.templatesOverride,
    action: sha ? "update" : "create",
    tokens: buildCommitTokens({
      action: sha ? "update" : "create",
      owner,
      repo,
      branch,
      path,
      contentName: options?.contentName,
      user: options?.user,
      userName: options?.editorName,
    }),
  });
  // Appended after the length cap so the editor's name is never truncated away.
  const message = options?.editorName
    ? `${resolvedMessage} — by ${options.editorName}`
    : resolvedMessage;

  try {
    // First attempt: try with original path
    const response = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: contentBase64,
      branch,
      sha: sha || undefined,
    });

    if (response.data.content && response.data.commit) {
      return response;
    }
    throw new Error("Invalid response structure");
  } catch (error: any) {
    const githubMessage =
      typeof error?.response?.data?.message === "string"
        ? error.response.data.message
        : undefined;

    if (error.status === 409) {
      if (githubMessage?.includes("Repository rule violations found")) {
        throw createHttpError(
          "This repository requires changes through a pull request. Save to a different branch or fork, or ask a maintainer to relax the repository rule for direct edits.",
          409
        );
      }

      if (sha) {
        throw createHttpError(
          "File has changed since you last loaded it. Please refresh the page and try again.",
          409
        );
      }
    }

    // Only handle 422 errors for new files (no sha)
    if (error.status === 422 && !sha) {
      if (options?.onConflict === "error") {
        throw createHttpError(`File \"${path}\" already exists.`, 409);
      }

      // Get directory contents to find next available name
      const parentDir = getParentPath(path);
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: parentDir || ".",
        ref: branch,
      });

      if (!Array.isArray(data)) {
        throw new Error("Expected directory listing");
      }

      const basename = path.split("/").pop() || "";
      const lastDotIndex = basename.lastIndexOf(".");
      const filename =
        lastDotIndex > 0 ? basename.slice(0, lastDotIndex) : basename;
      const extension =
        lastDotIndex > 0 ? basename.slice(lastDotIndex + 1) : "";
      const escapeRegExp = (value: string) =>
        value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const escapedFilename = escapeRegExp(filename);
      const escapedExtension = escapeRegExp(extension);
      const pattern = extension
        ? new RegExp(`^${escapedFilename}-(\\d+)\\.${escapedExtension}$`)
        : new RegExp(`^${escapedFilename}-(\\d+)$`);
      const maxNumber = Math.max(
        0,
        ...data.map((file) => {
          const match = file.name.match(pattern);
          return match ? parseInt(match[1], 10) : 0;
        })
      );

      // Try up to 3 times with incrementing numbers
      for (let i = 1; i <= 3; i++) {
        const candidateFilename = extension
          ? `${filename}-${maxNumber + i}.${extension}`
          : `${filename}-${maxNumber + i}`;
        const newPath = `${parentDir ? parentDir + "/" : ""}${candidateFilename}`;
        const resolvedFallbackMessage = resolveCommitMessage({
          configObject: options?.configObject,
          templatesOverride: options?.templatesOverride,
          action: "create",
          tokens: buildCommitTokens({
            action: "create",
            owner,
            repo,
            branch,
            path: newPath,
            contentName: options?.contentName,
            user: options?.user,
            userName: options?.editorName,
          }),
        });
        const fallbackMessage = options?.editorName
          ? `${resolvedFallbackMessage} — by ${options.editorName}`
          : resolvedFallbackMessage;
        try {
          const response = await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: newPath,
            message: fallbackMessage,
            content: contentBase64,
            branch,
          });

          if (response.data.content && response.data.commit) {
            return response;
          }
        } catch (error: any) {
          if (i === 3 || error.status !== 422) throw error;
          // Continue to next attempt if 422 (file already exists)
        }
      }
    }
    throw error;
  }
};

// /!\ THE FOLLOWING IS A BIT OF A WTF... But hear me out.
// We can't easily rename a file via the GitHub API. We could copy the file with a new path and
// then delete the original, but we'd then lose the commit history. So we resort to a rather
// barbaric approach, chaining 5 sequential API calls. More about the why and how:
// https://stackoverflow.com/questions/31563444/rename-a-file-with-github-api
// https://medium.com/@obodley/renaming-a-file-using-the-git-api-fed1e6f04188
// https://www.levibotelho.com/development/commit-a-file-with-the-github-api/
const githubRenameFile = async (
  token: string,
  owner: string,
  repo: string,
  branch: string,
  path: string,
  newPath: string,
  options?: {
    configObject?: Record<string, any>;
    templatesOverride?: Record<string, string>;
    contentName?: string;
    user?: string;
    editorName?: string;
  }
) => {
  const octokit = createOctokitInstance(token);

  // Step 1: Get the current branch commit SHA
  const currentSha = await getBranchHeadSha(owner, repo, branch, token);

  // Step 2: Get the current tree
  const { data: treeData } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: currentSha,
    recursive: "true",
  });
  const tree = treeData.tree;

  // Step 3: Create a new tree with the updated path
  const newTree = tree
    .filter((item) => item.type !== "tree")
    .map((item) => ({
      path: item.path === path ? newPath : item.path,
      mode: item.mode as "100644" | "100755" | "040000" | "160000" | "120000",
      type: item.type as "commit" | "tree" | "blob",
      sha: item.sha,
    }));

  const { data: newTreeData } = await octokit.rest.git.createTree({
    owner,
    repo,
    tree: newTree,
  });
  const newTreeSha = newTreeData.sha;

  // Step 4: Create a commit for the new tree
  const resolvedMessage = resolveCommitMessage({
    configObject: options?.configObject,
    templatesOverride: options?.templatesOverride,
    action: "rename",
    tokens: buildCommitTokens({
      action: "rename",
      owner,
      repo,
      branch,
      oldPath: path,
      newPath,
      contentName: options?.contentName,
      user: options?.user,
      userName: options?.editorName,
    }),
  });

  const { data: commitData } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message: options?.editorName
      ? `${resolvedMessage} — by ${options.editorName}`
      : resolvedMessage,
    tree: newTreeSha,
    parents: [currentSha],
  });
  const commitSha = commitData.sha;

  // Step 5: Point the branch at the new commit
  await octokit.rest.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: commitSha,
  });
  setBranchHeadSha(owner, repo, branch, commitSha);

  return {
    sha: commitSha,
    path: path,
    newPath: newPath,
  };
};

export const filesRouter = createTRPCRouter({
  save: authenticatedProcedure
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
        branch: z.string(),
        path: z.string(),
        type: z.enum(["content", "media", "settings"]),
        content: z.any(),
        sha: z.string().optional(),
        name: z.string().optional(),
        onConflict: z.enum(["rename", "error"]).optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      runCms(async () => {
        const user = ctx.session.user as User;

        await requireFeatureAccess(user, "cms");

        const { token } = await getToken(user, input.owner, input.repo, true);
        if (!token) throw new Error("Token not found");

        const normalizedPath = normalizePath(input.path);
        const basePath = await getBasePath(input.owner, input.repo);

        const config = await getConfig(input.owner, input.repo, input.branch, {
          getToken: async () => token,
        });
        if (!config && normalizedPath !== ".pages.yml")
          throw new Error(
            `Configuration not found for ${input.owner}/${input.repo}/${input.branch}.`
          );

        const onConflict = input.onConflict === "error" ? "error" : "rename";

        let contentBase64;
        let schema;
        let schemaCommitTemplates: Record<string, string> | undefined;
        let schemaCommitIdentity: "app" | "user" | undefined;

        switch (input.type) {
          case "content": {
            const validated = validateContentEntry({
              config,
              // The REST route passed the raw body value through untyped; the
              // schema lookup inside validateContentEntry rejects a missing name.
              name: input.name as string,
              path: normalizedPath,
              content: input.content,
              isCreate: !input.sha,
            });
            schema = validated.schema;
            schemaCommitTemplates = schema?.commit?.templates;
            schemaCommitIdentity = schema?.commit?.identity;

            if (validated.mode === "gitkeep") {
              contentBase64 = "";
            } else if (validated.mode === "body") {
              contentBase64 = Buffer.from(validated.body).toString("base64");
            } else {
              let finalContentObject = validated.contentObject;

              if (
                config?.object?.settings?.content?.merge &&
                input.sha &&
                !schema.list
              ) {
                const octokit = createOctokitInstance(token);
                const response = await octokit.rest.repos.getContent({
                  owner: input.owner,
                  repo: input.repo,
                  path: normalizedPath,
                  ref: input.branch,
                });

                if (Array.isArray(response.data)) {
                  throw new Error("Expected a file but found a directory");
                } else if (response.data.type !== "file") {
                  throw new Error("Invalid response type");
                }

                const existingContent = Buffer.from(
                  response.data.content,
                  "base64"
                ).toString();
                const existingContentObject = parse(existingContent, {
                  format: schema.format,
                  delimiters: schema.delimiters,
                });

                finalContentObject = mergeContentObjects(
                  existingContentObject,
                  validated.contentObject
                );
              }

              contentBase64 = Buffer.from(
                stringifyContentEntry(schema, finalContentObject)
              ).toString("base64");
            }
            break;
          }
          case "media":
            if (!input.name) throw new Error(`"name" is required for media.`);

            schema = getSchemaByName(config?.object, input.name, "media");
            if (!schema)
              throw new Error(`Media schema not found for ${input.name}.`);
            schemaCommitTemplates = schema?.commit?.templates;
            schemaCommitIdentity = schema?.commit?.identity;

            if (!normalizedPath.startsWith(schema.input))
              throw new Error(
                `Invalid path "${input.path}" for media "${input.name}".`
              );

            if (getFileName(normalizedPath) === ".gitkeep") {
              // Folder creation
              contentBase64 = "";
            } else {
              if (
                schema.extensions?.length > 0 &&
                !schema.extensions.includes(getFileExtension(normalizedPath))
              )
                throw new Error(
                  `Invalid extension "${getFileExtension(normalizedPath)}" for media.`
                );

              contentBase64 = input.content;
            }
            break;
          case "settings":
            assertAdminUser(user, "Only admins can manage settings.");
            if (normalizedPath !== ".pages.yml")
              throw new Error(`Invalid path "${input.path}" for settings.`);
            if (
              !input.sha &&
              !isContentOperationAllowed("create", { scope: "settings" })
            ) {
              throw createHttpError(
                `Creating the settings file isn't allowed.`,
                403
              );
            }

            contentBase64 = Buffer.from(input.content.body ?? "").toString(
              "base64"
            );
            break;
          default:
            throw new Error(`Invalid type "${input.type}".`);
        }

        const commitIdentity = resolveCommitIdentity({
          configObject: config?.object,
          identityOverride: schemaCommitIdentity,
        });
        // Commits are always authored by the org PAT owner; when the config asks
        // for user identity, the editor's name goes into the commit message instead
        // (stamping user emails as author can block Vercel deploys).
        const editorName =
          commitIdentity === "user" ? user.name?.trim() || user.email : undefined;

        // Settings live at `{basePath}/.pages.yml`; content/media paths are already
        // physical (rebased via the config schema), so they write as-is.
        const writePath =
          input.type === "settings"
            ? resolveConfigFilePath(basePath)
            : normalizedPath;

        const response = await githubSaveFile(
          token,
          input.owner,
          input.repo,
          input.branch,
          writePath,
          contentBase64,
          input.sha,
          {
            configObject: config?.object,
            templatesOverride: schemaCommitTemplates,
            contentName: input.name,
            user: user.email || user.name || String(user.id || ""),
            onConflict,
            editorName,
          }
        );

        const savedPath = response?.data.content?.path;

        let newConfig;
        if (input.type === "settings") {
          const parsedConfig = parseConfig(input.content.body ?? "");
          const configObject = rebaseConfigObject(
            normalizeConfig(parsedConfig.document.toJSON()),
            basePath
          );
          newConfig = {
            owner: input.owner,
            repo: input.repo,
            branch: input.branch,
            sha: response?.data.content?.sha as string,
            version: configVersion ?? "0.0",
            object: configObject,
          };

          await updateConfig(newConfig);
        }

        if (response?.data.content && response?.data.commit) {
          // If the file is successfully saved, update the cache
          await updateFileCache(
            input.type === "content" ? "collection" : "media",
            input.owner,
            input.repo,
            input.branch,
            {
              type: input.sha ? "modify" : "add",
              path: response.data.content.path!,
              sha: response.data.content.sha!,
              content: Buffer.from(contentBase64, "base64").toString("utf-8"),
              size: response.data.content.size,
              downloadUrl: response.data.content.download_url,
              commit: {
                sha: response.data.commit.sha!,
                timestamp: new Date(
                  response.data.commit.committer?.date ??
                    new Date().toISOString()
                ).getTime(),
              },
            }
          );
        }

        return {
          status: "success" as const,
          message:
            savedPath !== writePath
              ? `File "${normalizedPath}" saved successfully but renamed to "${savedPath}" to avoid naming conflict.`
              : `File "${normalizedPath}" saved successfully.`,
          data: {
            type: response?.data.content?.type,
            sha: response?.data.content?.sha,
            name: response?.data.content?.name,
            path: savedPath,
            extension: getFileExtension(response?.data.content?.name || ""),
            size: response?.data.content?.size,
            url: response?.data.content?.download_url,
            config: newConfig ?? undefined,
          },
        };
      })
    ),

  delete: authenticatedProcedure
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
        branch: z.string(),
        path: z.string(),
        sha: z.string(),
        type: z.enum(["content", "media"]),
        name: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      runCms(async () => {
        const user = ctx.session.user as User;

        await requireFeatureAccess(user, "cms");

        const { token } = await getToken(user, input.owner, input.repo, true);
        if (!token) throw new Error("Token not found");

        if (
          !isContentOperationAllowed("delete", { scope: "settings" }) &&
          input.path === ".pages.yml"
        ) {
          throw createHttpError(
            `Deleting the settings file isn't allowed.`,
            403
          );
        }

        const { sha, type, name } = input;

        if (!name && type === "content") throw new Error(`"name" is required.`);

        const config = await getConfig(input.owner, input.repo, input.branch, {
          getToken: async () => token,
        });
        if (!config)
          throw new Error(
            `Configuration not found for ${input.owner}/${input.repo}/${input.branch}.`
          );

        const normalizedPath = normalizePath(input.path);
        let schema;
        let schemaCommitTemplates: Record<string, string> | undefined;
        let schemaCommitIdentity: "app" | "user" | undefined;

        switch (type) {
          case "content":
            if (!name) throw new Error(`"name" is required for content.`);

            schema = getSchemaByName(config.object, name);
            if (!schema)
              throw new Error(`Content schema not found for ${name}.`);
            if (!isContentOperationAllowed("delete", { schema })) {
              throw createHttpError(
                `Deleting entries isn't allowed for "${name}".`,
                403
              );
            }
            schemaCommitTemplates = schema?.commit?.templates;
            schemaCommitIdentity = schema?.commit?.identity;

            if (!normalizedPath.startsWith(schema.path))
              throw new Error(
                `Invalid path "${input.path}" for ${type} "${name}".`
              );

            if (
              schema.subfolders === false &&
              getParentPath(normalizedPath) !== schema.path
            ) {
              throw new Error(
                `Subfolders are not allowed for collection "${name}".`
              );
            }

            if (getFileExtension(normalizedPath) !== (schema.extension ?? ""))
              throw new Error(
                `Invalid extension "${getFileExtension(normalizedPath)}" for ${type} "${name}".`
              );
            break;
          case "media":
            if (!name) throw new Error(`"name" is required for media.`);

            schema = getSchemaByName(config.object, name, "media");
            if (!schema) throw new Error(`Media schema not found for ${name}.`);
            schemaCommitTemplates = schema?.commit?.templates;
            schemaCommitIdentity = schema?.commit?.identity;

            if (!normalizedPath.startsWith(schema.input))
              throw new Error(
                `Invalid path "${input.path}" for media "${name}".`
              );

            if (
              schema.extensions?.length > 0 &&
              !schema.extensions.includes(getFileExtension(normalizedPath))
            )
              throw new Error(
                `Invalid extension "${getFileExtension(normalizedPath)}" for media.`
              );
            break;
        }

        const commitIdentity = resolveCommitIdentity({
          configObject: config.object,
          identityOverride: schemaCommitIdentity,
        });
        const editorName =
          commitIdentity === "user" ? user.name?.trim() || user.email : undefined;

        const octokit = createOctokitInstance(token);
        const response = await octokit.rest.repos.deleteFile({
          owner: input.owner,
          repo: input.repo,
          branch: input.branch,
          path: normalizedPath,
          sha: sha,
          message: (() => {
            const resolvedMessage = resolveCommitMessage({
              configObject: config.object,
              templatesOverride: schemaCommitTemplates,
              action: "delete",
              tokens: buildCommitTokens({
                action: "delete",
                owner: input.owner,
                repo: input.repo,
                branch: input.branch,
                path: normalizedPath,
                contentName: name || undefined,
                user: user.email || user.name || String(user.id || ""),
                userName: editorName,
              }),
            });
            return editorName
              ? `${resolvedMessage} — by ${editorName}`
              : resolvedMessage;
          })(),
        });

        // Update cache after successful deletion
        await updateFileCache(
          type === "content" ? "collection" : "media",
          input.owner,
          input.repo,
          input.branch,
          {
            type: "delete",
            path: normalizedPath,
            commit: response?.data.commit?.sha
              ? {
                  sha: response.data.commit.sha,
                  timestamp: new Date(
                    response.data.commit.committer?.date ??
                      new Date().toISOString()
                  ).getTime(),
                }
              : undefined,
          }
        );

        return {
          status: "success" as const,
          message: `File "${normalizedPath}" deleted successfully.`,
          data: {
            sha: response?.data.commit.sha,
            name: response?.data.content?.name,
            path: response?.data.content?.path,
          },
        };
      })
    ),

  rename: authenticatedProcedure
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
        branch: z.string(),
        path: z.string(),
        type: z.enum(["content", "media"]),
        name: z.string().optional(),
        newPath: z.string(),
      })
    )
    .mutation(({ ctx, input }) =>
      runCms(async () => {
        const user = ctx.session.user as User;

        await requireFeatureAccess(user, "cms");

        const { token } = await getToken(user, input.owner, input.repo, true);
        if (!token) throw new Error("Token not found");

        if (
          !isContentOperationAllowed("rename", { scope: "settings" }) &&
          input.path === ".pages.yml"
        ) {
          throw createHttpError(
            `Renaming the settings file isn't allowed.`,
            403
          );
        }

        const config = await getConfig(input.owner, input.repo, input.branch, {
          getToken: async () => token,
        });
        if (!config)
          throw new Error(
            `Configuration not found for ${input.owner}/${input.repo}/${input.branch}.`
          );

        if (!input.name && input.type === "content")
          throw new Error(`"name" is required.`);

        const normalizedPath = normalizePath(input.path);
        const normalizedNewPath = normalizePath(input.newPath);
        if (normalizedPath === normalizedNewPath)
          throw new Error(
            `New path "${input.newPath}" is the same as the old path.`
          );

        let schema;
        let schemaCommitTemplates: Record<string, string> | undefined;
        let schemaCommitIdentity: "app" | "user" | undefined;

        switch (input.type) {
          case "content":
            if (!input.name) throw new Error(`"name" is required for content.`);

            schema = getSchemaByName(config.object, input.name);
            if (!schema)
              throw new Error(`Content schema not found for ${input.name}.`);
            if (!isContentOperationAllowed("rename", { schema })) {
              throw createHttpError(
                `Renaming entries isn't allowed for "${input.name}".`,
                403
              );
            }
            schemaCommitTemplates = schema?.commit?.templates;
            schemaCommitIdentity = schema?.commit?.identity;

            if (schema.type === "file")
              throw new Error(`Renaming content of type "file" isn't allowed.`);

            if (!normalizedPath.startsWith(schema.path))
              throw new Error(
                `Invalid path "${input.path}" for ${input.type} "${input.name}".`
              );
            if (!normalizedNewPath.startsWith(schema.path))
              throw new Error(
                `Invalid path "${input.newPath}" for ${input.type} "${input.name}".`
              );

            if (getFileExtension(normalizedPath) !== (schema.extension ?? ""))
              throw new Error(
                `Invalid extension "${getFileExtension(normalizedPath)}" for ${input.type} "${input.name}".`
              );
            if (
              getFileExtension(normalizedNewPath) !== (schema.extension ?? "")
            )
              throw new Error(
                `Invalid extension "${getFileExtension(normalizedNewPath)}" for ${input.type} "${input.name}".`
              );
            break;
          case "media":
            if (!input.name) throw new Error(`"name" is required for media.`);

            schema = getSchemaByName(config.object, input.name, "media");
            if (!schema)
              throw new Error(`Media schema not found for ${input.name}.`);
            schemaCommitTemplates = schema?.commit?.templates;
            schemaCommitIdentity = schema?.commit?.identity;

            if (!normalizedPath.startsWith(schema.input))
              throw new Error(`Invalid path "${input.path}" for media.`);
            if (!normalizedNewPath.startsWith(schema.input))
              throw new Error(`Invalid path "${input.newPath}" for media.`);

            if (
              schema.extensions?.length > 0 &&
              !schema.extensions.includes(getFileExtension(normalizedPath))
            )
              throw new Error(
                `Invalid extension "${getFileExtension(normalizedPath)}" for media.`
              );
            if (
              schema.extensions?.length > 0 &&
              !schema.extensions.includes(getFileExtension(normalizedNewPath))
            )
              throw new Error(
                `Invalid extension "${getFileExtension(normalizedNewPath)}" for media.`
              );
            break;
        }

        const commitIdentity = resolveCommitIdentity({
          configObject: config.object,
          identityOverride: schemaCommitIdentity,
        });
        const editorName =
          commitIdentity === "user" ? user.name?.trim() || user.email : undefined;

        const response = await githubRenameFile(
          token,
          input.owner,
          input.repo,
          input.branch,
          normalizedPath,
          normalizedNewPath,
          {
            configObject: config.object,
            templatesOverride: schemaCommitTemplates,
            contentName: input.name,
            user: user.email || user.name || String(user.id || ""),
            editorName,
          }
        );

        // Update the cache with the rename operation
        await updateFileCache(
          input.type === "content" ? "collection" : "media",
          input.owner,
          input.repo,
          input.branch,
          {
            type: "rename",
            path: normalizedPath,
            newPath: normalizedNewPath,
            commit: {
              sha: response.sha,
              timestamp: Date.now(),
            },
          }
        );

        return {
          status: "success" as const,
          message: `File "${normalizedPath}" moved to "${normalizedNewPath}".`,
          data: {
            path: response?.path,
            newPath: response?.newPath,
          },
        };
      })
    ),
});
