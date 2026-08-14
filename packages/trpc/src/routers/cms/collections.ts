import z from "zod";

import { readFns } from "@workspace/cms-core/fields/registry";
import {
  deepMap,
  getDateFromFilename,
  getFieldByPath,
  getSchemaByName,
  safeAccess,
} from "@workspace/cms-core/schema";
import {
  getFileExtension,
  getParentPath,
  normalizePath,
  serializedTypes,
} from "@workspace/cms-core/utils/file";

import { authenticatedProcedure, createTRPCRouter } from "../../init";
import {
  buildCommitTokens,
  resolveCommitIdentity,
  resolveCommitMessage,
} from "../../lib/cms/commit-message";
import { getConfig } from "../../lib/cms/config-store";
import { createHttpError, runCms } from "../../lib/cms/errors";
import { requireFeatureAccess } from "../../lib/cms/feature-access";
import {
  getBranchHeadSha,
  getCollectionCache,
  setBranchHeadSha,
  updateFileCache,
} from "../../lib/cms/github-cache-file";
import { createOctokitInstance } from "../../lib/cms/octokit";
import { getRepoReadContext } from "../../lib/cms/repo-context";
import { parse, stringify } from "../../lib/cms/serialization";
import { getToken } from "../../lib/cms/token";
import type { User } from "../../lib/cms/types";

// Swap for the shared helper from ../../lib/cms/session-user once it lands.
const toCmsUser = (user: unknown): User => user as User;

const setByPath = (target: Record<string, any>, path: string, value: any) => {
  if (!path) return;
  const segments = path.split(".");
  let cursor: Record<string, any> = target;

  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i]!;
    if (
      cursor[key] == null ||
      typeof cursor[key] !== "object" ||
      Array.isArray(cursor[key])
    ) {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }

  cursor[segments[segments.length - 1]!] = value;
};

const pickAndTransformFields = (
  parsedObject: Record<string, any>,
  schemaFields: any[],
  fieldPaths: string[],
  config: Record<string, any>
) => {
  const output: Record<string, any> = {};
  const dedupedPaths = Array.from(new Set(fieldPaths));

  dedupedPaths.forEach((fieldPath) => {
    const field = getFieldByPath(schemaFields, fieldPath);
    if (!field) return;

    let value = safeAccess(parsedObject, fieldPath);
    if (typeof field.type === "string" && readFns[field.type]) {
      const transformedValue = readFns[field.type](value, field, config);
      if (transformedValue !== undefined) value = transformedValue;
    }
    setByPath(output, fieldPath, value);
  });

  return output;
};

// Parse the list of entries into objects based on the content schema.
const parseContents = (
  contents: any,
  schema: Record<string, any>,
  config: Record<string, any>,
  selectedFields?: string[]
): {
  contents: Record<string, any>[];
  errors: string[];
} => {
  const excludedFiles = schema.exclude || [];
  const extension = schema.extension ?? "";

  let parsedContents: Record<string, any>[] = [];
  let parsedErrors: string[] = [];

  parsedContents = contents
    .map((item: any) => {
      // If it's a file and it matches the schema extension
      if (
        item.type === "file" &&
        (extension === "" || item.path.endsWith(`.${extension}`)) &&
        !excludedFiles.includes(item.name)
      ) {
        let contentObject: Record<string, any> = {};

        if (serializedTypes.includes(schema.format) && schema.fields) {
          // If we are dealing with a serialized format and we have fields defined
          try {
            const parsedObject = parse(item.content, {
              format: schema.format,
              delimiters: schema.delimiters,
            });
            if (Array.isArray(selectedFields) && selectedFields.length > 0) {
              const requestedFieldPaths = selectedFields
                .filter((fieldPath) => fieldPath !== "path")
                .map((fieldPath) =>
                  fieldPath.startsWith("fields.")
                    ? fieldPath.replace(/^fields\./, "")
                    : fieldPath
                );
              contentObject = pickAndTransformFields(
                parsedObject,
                schema.fields,
                requestedFieldPaths,
                config
              );
            } else {
              // TODO: review if this works for blocks
              contentObject = deepMap(
                parsedObject,
                schema.fields,
                (value, field) => {
                  if (typeof field.type === "string" && readFns[field.type]) {
                    return readFns[field.type](value, field, config);
                  }
                  return value;
                }
              );
            }
          } catch (error: any) {
            console.error(
              `Error parsing frontmatter for file "${item.path}": ${error.message}`
            );
            parsedErrors.push(
              `Error parsing frontmatter for file "${item.path}": ${error.message}`
            );
          }
        }

        if (!schema.fields || schema.fields.length === 0) {
          // If we don't have fields defined, we just add the name for display
          contentObject.name = item.name;
        }

        // TODO: make this configurable
        // TODO: support other date formats
        if (
          !contentObject.date &&
          schema.filename.startsWith("{year}-{month}-{day}")
        ) {
          // If we couldn't get a date from the content and filenames have a date, we extract it
          const filenameDate = getDateFromFilename(item.name);
          if (filenameDate) {
            contentObject.date = filenameDate.string;
          }
        }

        return {
          sha: item.sha,
          name: item.name,
          parentPath: item.parentPath,
          path: item.path,
          content: item.content,
          fields: contentObject,
          type: "file",
          isNode: item.isNode,
        };
      } else if (
        item.type === "dir" &&
        !excludedFiles.includes(item.name) &&
        schema.subfolders !== false
      ) {
        return {
          name: item.name,
          parentPath: item.parentPath,
          path: item.path,
          type: "dir",
        };
      }
    })
    .filter((item: any) => item !== undefined);

  return {
    contents: parsedContents,
    errors: parsedErrors,
  };
};

export const collectionsRouter = createTRPCRouter({
  /**
   * Fetches and parses collection contents from GitHub repositories
   * (for collection views and searches). If type is "search", contents are
   * filtered by query and fields.
   */
  list: authenticatedProcedure
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
        branch: z.string(),
        name: z.string(),
        path: z.string().optional(),
        type: z.string().optional(),
        query: z.string().optional(),
        fields: z.array(z.string()).optional(),
      })
    )
    .query(({ ctx, input }) =>
      runCms(async () => {
        const { token, config } = await getRepoReadContext(
          input,
          toCmsUser(ctx.session.user)
        );

        const schema = getSchemaByName(config.object, input.name);
        if (!schema)
          throw createHttpError(`Schema not found for ${input.name}.`, 404);

        const path = input.path || "";
        const type = input.type;
        const query = input.query || "";
        const fields = input.fields?.length ? input.fields : ["name"];

        const normalizedPath = normalizePath(path);
        if (!normalizedPath.startsWith(schema.path))
          throw createHttpError(
            `Invalid path "${path}" for collection "${input.name}".`,
            400
          );

        if (schema.subfolders === false) {
          if (normalizedPath !== schema.path)
            throw createHttpError(
              `Invalid path "${path}" for collection "${input.name}".`,
              400
            );
        }

        let entries = await getCollectionCache(
          input.owner,
          input.repo,
          input.branch,
          normalizedPath,
          token,
          schema.view?.node?.filename
        );

        let data: {
          contents: Record<string, any>[];
          errors: string[];
        } = {
          contents: [],
          errors: [],
        };

        if (schema.view?.node?.filename) {
          // Remove node entries from subfolders
          entries = entries.filter(
            (item: any) =>
              item.isNode ||
              item.parentPath === schema.path ||
              item.name !== schema.view.node.filename
          );
        }

        if (["all", "nodes", "others"].includes(schema.view?.node?.hideDirs)) {
          if (schema.view.node.hideDirs === "all") {
            // Remove all dirs
            entries = entries.filter((item: any) => item.type !== "dir");
          } else if (["nodes", "others"].includes(schema.view.node.hideDirs)) {
            // Remove node dirs or non node dirs
            entries = entries.filter(
              (item: any) =>
                item.type !== "dir" ||
                (schema.view.node.hideDirs === "others"
                  ? entries.some(
                      (subItem: any) =>
                        subItem.parentPath === item.path && subItem.isNode
                    )
                  : !entries.some(
                      (subItem: any) =>
                        subItem.parentPath === item.path && subItem.isNode
                    ))
            );
          }
        }

        if (entries) {
          data = parseContents(entries, schema, config, fields);

          // If this is a search request, filter the contents
          if (type === "search" && query) {
            const searchQuery = query.toLowerCase();
            const searchFields = fields;

            data.contents = data.contents.filter((item) => {
              if (searchFields.length === 0) {
                if (
                  (item.name &&
                    item.name.toLowerCase().includes(searchQuery)) ||
                  (item.path && item.path.toLowerCase().includes(searchQuery))
                ) {
                  return true;
                }

                return (
                  item.content &&
                  item.content.toLowerCase().includes(searchQuery)
                );
              }

              return searchFields.some((field) => {
                if (field === "name" || field === "path") {
                  const value = item[field];
                  return (
                    value && String(value).toLowerCase().includes(searchQuery)
                  );
                }

                if (field.startsWith("fields.")) {
                  const fieldPath = field.replace("fields.", "");
                  const value = safeAccess(item.fields, fieldPath);
                  return (
                    value && String(value).toLowerCase().includes(searchQuery)
                  );
                }

                return false;
              });
            });
          }
        }

        return data;
      })
    ),

  /**
   * Reorders a collection's entries by rewriting the collection's order field
   * (`view.reorder`) in every entry whose value changed, in a single commit.
   */
  reorder: authenticatedProcedure
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
        branch: z.string(),
        name: z.string(),
        path: z.string().min(1, `"path" is required.`),
        items: z
          .array(
            z.object({
              path: z.string(),
              sha: z.string().optional(),
              value: z.number(),
            })
          )
          .min(1, `"items" is required and must be a non-empty array.`),
      })
    )
    .mutation(({ ctx, input }) =>
      runCms(async () => {
        const user = toCmsUser(ctx.session.user);

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

        const schema = getSchemaByName(config.object, input.name);
        if (!schema)
          throw new Error(`Content schema not found for ${input.name}.`);
        if (schema.type !== "collection")
          throw createHttpError(
            `Reordering is only available for collections.`,
            400
          );

        const orderField = schema.view?.reorder;
        if (!orderField || typeof orderField !== "string")
          throw createHttpError(
            `Reordering isn't configured for "${input.name}" (set "view.reorder").`,
            400
          );
        const orderFieldSchema = getFieldByPath(schema.fields, orderField);
        if (!orderFieldSchema || orderFieldSchema.type !== "number")
          throw createHttpError(
            `"view.reorder" must reference a number field ("${orderField}" isn't one).`,
            400
          );
        if (!serializedTypes.includes(schema.format) || schema.format === "raw")
          throw createHttpError(
            `Reordering isn't supported for the "${schema.format}" format.`,
            400
          );

        const normalizedDirPath = normalizePath(input.path);
        if (
          normalizedDirPath !== schema.path &&
          !normalizedDirPath.startsWith(`${schema.path}/`)
        )
          throw new Error(
            `Invalid path "${input.path}" for collection "${input.name}".`
          );

        const seenPaths = new Set<string>();
        const seenValues = new Set<number>();
        const items: { path: string; sha?: string; value: number }[] =
          input.items.map((item) => {
            const itemPath = normalizePath(item.path);
            if (getParentPath(itemPath) !== normalizedDirPath)
              throw new Error(
                `Invalid item path "${item.path}": reordering is limited to "${normalizedDirPath}".`
              );
            if (getFileExtension(itemPath) !== (schema.extension ?? ""))
              throw new Error(
                `Invalid extension for "${item.path}" in collection "${input.name}".`
              );
            if (!Number.isInteger(item.value) || item.value < 0)
              throw new Error(
                `Invalid order value for "${item.path}": must be a non-negative integer.`
              );
            if (seenPaths.has(itemPath))
              throw new Error(`Duplicate item path "${item.path}".`);
            if (seenValues.has(item.value))
              throw new Error(`Duplicate order value ${item.value}.`);
            seenPaths.add(itemPath);
            seenValues.add(item.value);

            return { path: itemPath, sha: item.sha, value: item.value };
          });

        const entries = await getCollectionCache(
          input.owner,
          input.repo,
          input.branch,
          normalizedDirPath,
          token,
          schema.view?.node?.filename
        );
        const entryByPath = new Map(
          entries
            .filter((entry: any) => entry.type === "file")
            .map((entry: any) => [entry.path, entry])
        );

        const changes: { path: string; content: string; value: number }[] = [];
        for (const item of items) {
          const entry: any = entryByPath.get(item.path);
          if (!entry || entry.content == null)
            throw createHttpError(`File "${item.path}" not found.`, 404);
          if (item.sha && entry.sha && item.sha !== entry.sha)
            throw createHttpError(
              `Entries changed since you loaded them. Refresh and try again.`,
              409
            );

          const parsed =
            parse(entry.content, {
              format: schema.format,
              delimiters: schema.delimiters,
            }) ?? {};
          const currentValue = safeAccess(parsed, orderField);
          if (Number(currentValue) === item.value) continue;

          setByPath(parsed, orderField, item.value);
          changes.push({
            path: item.path,
            content: stringify(parsed, {
              format: schema.format,
              delimiters: schema.delimiters,
            }),
            value: item.value,
          });
        }

        if (changes.length === 0) {
          return {
            message: "Nothing to reorder.",
            commitSha: null as string | null,
            updated: [] as { path: string; sha: string | null; value: number }[],
          };
        }

        const commitIdentity = resolveCommitIdentity({
          configObject: config.object,
          identityOverride: schema?.commit?.identity,
        });
        const editorName =
          commitIdentity === "user"
            ? user.name?.trim() || user.email
            : undefined;

        const resolvedMessage = resolveCommitMessage({
          configObject: config.object,
          templatesOverride: schema?.commit?.templates,
          action: "reorder",
          tokens: buildCommitTokens({
            action: "reorder",
            owner: input.owner,
            repo: input.repo,
            branch: input.branch,
            path: normalizedDirPath,
            contentName: input.name,
            user: user.email || user.name || String(user.id || ""),
            userName: editorName,
          }),
        });

        const octokit = createOctokitInstance(token);
        const currentSha = await getBranchHeadSha(
          input.owner,
          input.repo,
          input.branch,
          token
        );

        const blobEntries = await Promise.all(
          changes.map(async (change) => {
            const { data: blobData } = await octokit.rest.git.createBlob({
              owner: input.owner,
              repo: input.repo,
              content: change.content,
              encoding: "utf-8",
            });
            return {
              path: change.path,
              mode: "100644" as const,
              type: "blob" as const,
              sha: blobData.sha,
            };
          })
        );

        const { data: newTreeData } = await octokit.rest.git.createTree({
          owner: input.owner,
          repo: input.repo,
          base_tree: currentSha,
          tree: blobEntries,
        });

        const { data: commitData } = await octokit.rest.git.createCommit({
          owner: input.owner,
          repo: input.repo,
          message: editorName
            ? `${resolvedMessage} — by ${editorName}`
            : resolvedMessage,
          tree: newTreeData.sha,
          parents: [currentSha],
        });
        const commitSha = commitData.sha;

        try {
          await octokit.rest.git.updateRef({
            owner: input.owner,
            repo: input.repo,
            ref: `heads/${input.branch}`,
            sha: commitSha,
          });
        } catch (error: any) {
          if (error?.status === 422)
            throw createHttpError(
              `The branch changed while saving the new order. Refresh and try again.`,
              409
            );
          throw error;
        }
        setBranchHeadSha(input.owner, input.repo, input.branch, commitSha);

        const blobShaByPath = new Map(
          blobEntries.map((entry) => [entry.path, entry.sha])
        );
        const updated = changes.map((change) => ({
          path: change.path,
          sha: blobShaByPath.get(change.path) ?? null,
          value: change.value,
        }));

        for (const change of changes) {
          await updateFileCache(
            "collection",
            input.owner,
            input.repo,
            input.branch,
            {
              type: "modify",
              path: change.path,
              sha: blobShaByPath.get(change.path) ?? undefined,
              content: change.content,
              size: Buffer.byteLength(change.content),
              commit: {
                sha: commitSha,
                timestamp: Date.now(),
              },
            }
          );
        }

        return {
          message: `Reordered ${changes.length} ${changes.length === 1 ? "entry" : "entries"}.`,
          commitSha: commitSha as string | null,
          updated,
        };
      })
    ),
});
