import { TRPCError } from "@trpc/server";
import z from "zod";

import { getFileExtension, normalizePath } from "@workspace/cms-core/utils/file";

import { cmsProcedure, createTRPCRouter } from "../../init";
import { createHttpError, toTRPCError } from "../../lib/cms/errors";
import { getMediaCache } from "../../lib/cms/github-cache-file";
import { getRepoReadContext } from "../../lib/cms/repo-context";

// REST URL-encoded the path segment and decoded it here; tRPC inputs arrive
// decoded, so no decodeURIComponent on the raw path.
const normalizeMediaPath = (
  rawPath: string,
  owner: string,
  repo: string,
  branch: string
) => {
  const decodedPath = rawPath || "";

  // Handle markdown-link wrappers: [label](target)
  const markdownMatch = decodedPath.match(/^\[.*?\]\((.+)\)$/);
  const markdownLooseMatch = decodedPath.match(/^\[.*?\]\((.+)$/);
  const candidate = (
    markdownMatch?.[1] ||
    markdownLooseMatch?.[1]?.replace(/\)$/, "") ||
    decodedPath
  ).trim();

  // If caller accidentally passes a raw.githubusercontent URL, map it back to repo-relative path.
  let repoRelativePath = candidate;
  if (candidate.startsWith("https://raw.githubusercontent.com/")) {
    try {
      const url = new URL(candidate);
      const pathname = decodeURIComponent(url.pathname || "");
      const branchPrefix = `/${owner}/${repo}/${branch}/`;
      if (pathname.startsWith(branchPrefix)) {
        repoRelativePath = pathname.slice(branchPrefix.length);
      }
    } catch {
      repoRelativePath = candidate;
    }
  }

  repoRelativePath =
    repoRelativePath.split("#")[0]?.split("?")[0] || repoRelativePath;

  return normalizePath(repoRelativePath);
};

export const mediaRouter = createTRPCRouter({
  /**
   * Get the list of media files in a directory (with extension filtering,
   * dirs-first sorting and download URLs).
   */
  list: cmsProcedure
    .input(
      z.object({
        branch: z.string(),
        name: z.string(),
        path: z.string(),
        nocache: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { config } = await getRepoReadContext(
          input,
          ctx.user,
          ctx.token
        );

        const mediaConfig =
          config.object.media.find((item: any) => item.name === input.name) ||
          config.object.media[0];

        if (!mediaConfig) {
          if (input.name)
            throw createHttpError(
              `No media configuration named "${input.name}" found for ${input.owner}/${input.repo}/${input.branch}.`,
              404
            );
          throw createHttpError(
            `No media configuration found for ${input.owner}/${input.repo}/${input.branch}.`,
            404
          );
        }

        const normalizedPath = normalizeMediaPath(
          input.path,
          input.owner,
          input.repo,
          input.branch
        );
        if (!normalizedPath.startsWith(mediaConfig.input))
          throw createHttpError(
            `Invalid path "${input.path}" for media "${input.name}".`,
            400
          );

        let results;
        try {
          results = await getMediaCache(
            input.owner,
            input.repo,
            input.branch,
            normalizedPath,
            ctx.token,
            !!input.nocache
          );
        } catch (error: any) {
          if (error?.status === 404) {
            results = [];
          } else {
            throw error;
          }
        }

        if (mediaConfig.extensions && mediaConfig.extensions.length > 0) {
          results = results.filter((item: any) => {
            if (item.type === "dir") return true;
            const extension = getFileExtension(item.name);
            return mediaConfig.extensions.includes(extension);
          });
        }

        results.sort((a: any, b: any) => {
          if (a.type === b.type) {
            return a.name.localeCompare(b.name);
          } else {
            return a.type === "dir" ? -1 : 1;
          }
        });

        return results.map((item: any) => {
          return {
            type: item.type,
            sha: item.sha,
            name: item.name,
            path: item.path,
            extension:
              item.type === "dir" ? undefined : getFileExtension(item.name),
            size: item.size,
            url: item.downloadUrl,
          };
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),
});
