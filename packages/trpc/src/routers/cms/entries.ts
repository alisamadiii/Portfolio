import z from "zod";

import { readFns } from "@workspace/cms-core/fields/registry";
import { deepMap, getSchemaByName } from "@workspace/cms-core/schema";
import {
  getFileExtension,
  normalizePath,
  serializedTypes,
} from "@workspace/cms-core/utils/file";

import { authenticatedProcedure, createTRPCRouter } from "../../init";
import { assertAdminUser } from "../../lib/cms/authz-shared";
import { getConfig } from "../../lib/cms/config-store";
import { createHttpError, runCms } from "../../lib/cms/errors";
import { createOctokitInstance } from "../../lib/cms/octokit";
import {
  getBasePath,
  resolveConfigFilePath,
} from "../../lib/cms/repo-settings";
import { parse } from "../../lib/cms/serialization";
import { getToken } from "../../lib/cms/token";
import type { User } from "../../lib/cms/types";

// Swap for the shared helper from ../../lib/cms/session-user once it lands.
const toCmsUser = (user: unknown): User => user as User;

// Parse the entry into an object based on the content schema.
const parseContent = (
  content: string,
  schema: Record<string, any>,
  config: Record<string, any>
) => {
  let contentObject: Record<string, any> = {};

  if (
    serializedTypes.includes(schema && schema.format) &&
    schema.fields &&
    schema.fields.length > 0
  ) {
    // If we are dealing with a serialized format and we have fields defined
    try {
      contentObject = parse(content, {
        format: schema.format,
        delimiters: schema.delimiters,
      });
      // We resort to the same trick as with the client, wrapping things in a listWrapper object if we're dealing with a list at the root
      let entryFields;
      if (schema.list) {
        contentObject = { listWrapper: contentObject };
        entryFields = [
          {
            name: "listWrapper",
            type: "object",
            list: true,
            fields: schema.fields,
          },
        ];
      } else {
        entryFields = schema.fields;
      }

      contentObject = deepMap(contentObject, entryFields, (value, field) => {
        const type = field.type;
        if (typeof type === "string" && readFns[type]) {
          return readFns[type](value, field, config);
        }
        return value;
      });
      if (schema.list) contentObject = contentObject.listWrapper;
    } catch (error: any) {
      throw createHttpError(`Error parsing frontmatter: ${error.message}`, 400);
    }
  } else {
    contentObject = { body: content };
  }

  return contentObject;
};

export const entriesRouter = createTRPCRouter({
  /**
   * Fetches and parses individual file contents from GitHub repositories
   * (usually for editing). If no schema name is provided, the path must be
   * ".pages.yml" (admin only) and the raw contents are returned. With
   * `meta: true` (and no name), only the cached config metadata is returned.
   */
  get: authenticatedProcedure
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
        branch: z.string(),
        // Repo-relative file path. REST URL-encoded this segment; tRPC inputs
        // arrive decoded, so no decodeURIComponent here.
        path: z.string(),
        name: z.string().optional(),
        meta: z.boolean().optional(),
      })
    )
    .query(({ ctx, input }) =>
      runCms(async () => {
        const user = toCmsUser(ctx.session.user);

        const { token } = await getToken(user, input.owner, input.repo);
        if (!token) throw createHttpError("Token not found", 401);

        const name = input.name;
        const metaOnly = input.meta === true;

        const normalizedPath = normalizePath(input.path);
        if (normalizedPath === ".pages.yml") {
          assertAdminUser(user, "Only admins can access settings.");
        }

        if (!name && normalizedPath !== ".pages.yml") {
          throw createHttpError(
            'If no content entry name is provided, the path must be ".pages.yml".',
            400
          );
        }

        if (!name && normalizedPath === ".pages.yml" && metaOnly) {
          const cachedConfig = await getConfig(
            input.owner,
            input.repo,
            input.branch,
            {
              getToken: async () => token,
            }
          );
          return {
            sha: cachedConfig?.sha ?? null,
            version: cachedConfig?.version ?? null,
            lastCheckedAt: cachedConfig?.lastCheckedAt ?? null,
          };
        }

        let config;
        let schema;

        if (name) {
          config = await getConfig(input.owner, input.repo, input.branch, {
            getToken: async () => token,
          });
          if (!config)
            throw createHttpError(
              `Configuration not found for ${input.owner}/${input.repo}/${input.branch}.`,
              404
            );

          schema = getSchemaByName(config.object, name);
          if (!schema)
            throw createHttpError(`Schema not found for ${name}.`, 404);

          if (!normalizedPath.startsWith(schema.path))
            throw createHttpError(
              `Invalid path "${input.path}" for ${schema.type} "${name}".`,
              400
            );

          const extension = schema.extension ?? "";
          if (getFileExtension(normalizedPath) !== extension) {
            throw createHttpError(
              `Invalid extension "${getFileExtension(normalizedPath)}" for ${schema.type} "${name}".`,
              400
            );
          }
        } else {
          config = {};
        }

        // Settings live at `{basePath}/.pages.yml`; content paths are already
        // physical (rebased via the config schema).
        const readPath =
          normalizedPath === ".pages.yml"
            ? resolveConfigFilePath(await getBasePath(input.owner, input.repo))
            : normalizedPath;

        const octokit = createOctokitInstance(token);
        let response;
        try {
          response = await octokit.rest.repos.getContent({
            owner: input.owner,
            repo: input.repo,
            path: readPath,
            ref: input.branch,
          });
        } catch (error: any) {
          if (error?.status === 404) {
            throw createHttpError("Not found", 404);
          }
          throw error;
        }

        if (Array.isArray(response.data)) {
          throw createHttpError("Expected a file but found a directory", 400);
        } else if (response.data.type !== "file") {
          throw createHttpError("Invalid response type", 500);
        }

        const content = Buffer.from(response.data.content, "base64").toString();
        const contentObject = name
          ? parseContent(content, schema, config)
          : { body: content };

        return {
          sha: response.data.sha,
          name: response.data.name,
          path: response.data.path,
          contentObject,
        };
      })
    ),
});
