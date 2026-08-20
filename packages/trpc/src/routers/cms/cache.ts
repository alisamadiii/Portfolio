import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import z from "zod";

import { adminRepoProcedure, createTRPCRouter } from "@workspace/trpc/init";

import { isCacheEnabled } from "@workspace/cms-core/config";
import { getConfig } from "@workspace/trpc/lib/cms/config-store";
import {
  cacheFileTable,
  configTable,
  db,
} from "@workspace/trpc/lib/cms/db";
import { createHttpError, toTRPCError } from "@workspace/trpc/lib/cms/errors";
import {
  clearFileCache,
  ensureFileCacheFreshness,
  getBranchHeadSha,
} from "@workspace/trpc/lib/cms/github-cache-file";
import {
  deleteCacheFileMeta,
  getCacheFileMeta,
  listCacheFileMeta,
  upsertCacheFileMeta,
} from "@workspace/trpc/lib/cms/github-cache-meta";

// Shared preamble of both cache procedures (admin access comes from the
// procedure): the repo must have caching enabled in its config.
const ensureCacheEnabled = async (
  owner: string,
  repo: string,
  branch: string,
  token: string
) => {
  const config = await getConfig(owner, repo, branch, {
    sync: true,
    getToken: async () => token,
    backgroundRefreshWhenStale: true,
  });
  if (!config?.object || !isCacheEnabled(config.object)) {
    throw createHttpError("Cache is disabled for this repository.", 403);
  }
};

export const cacheRouter = createTRPCRouter({
  /** Cache dashboard data. Port of GET /api/[owner]/[repo]/[branch]/cache. */
  status: adminRepoProcedure
    .input(z.object({ branch: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const { owner, repo, branch } = input;
        const token = ctx.token;

        await ensureCacheEnabled(owner, repo, branch, token);

        // Keep DB access mostly sequential to avoid spiking pool usage on the cache dashboard.
        const meta = await getCacheFileMeta(owner, repo, branch);
        const metaEntries = await listCacheFileMeta(owner, repo, branch);
        const folderMeta = metaEntries.filter(
          (entry) => entry.context !== "branch"
        );
        const fileCountResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(cacheFileTable)
          .where(
            and(
              eq(cacheFileTable.owner, owner.toLowerCase()),
              eq(cacheFileTable.repo, repo.toLowerCase()),
              eq(cacheFileTable.branch, branch)
            )
          );
        const cachedConfig = await db.query.hubConfig.findFirst({
          where: and(
            sql`lower(${configTable.owner}) = lower(${owner})`,
            sql`lower(${configTable.repo}) = lower(${repo})`,
            eq(configTable.branch, branch)
          ),
        });
        const branchHeadSha = await getBranchHeadSha(
          owner,
          repo,
          branch,
          token
        );

        return {
          fileMeta: meta ?? null,
          folderMeta,
          fileCount: Number(fileCountResult[0]?.count || 0),
          config: cachedConfig
            ? {
                sha: cachedConfig.sha,
                lastCheckedAt: cachedConfig.lastCheckedAt,
                version: cachedConfig.version,
              }
            : null,
          branchHeadSha,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),

  /** Cache maintenance actions. Port of POST /api/[owner]/[repo]/[branch]/cache. */
  action: adminRepoProcedure
    .input(
      z.object({
        branch: z.string(),
        action: z.enum([
          "reconcile-file-cache",
          "clear-file-cache",
          "refresh-config",
          "clear-config-cache",
          "clear-all-cache",
        ]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { owner, repo, branch } = input;
        const token = ctx.token;

        await ensureCacheEnabled(owner, repo, branch, token);

        switch (input.action) {
          case "reconcile-file-cache":
            await ensureFileCacheFreshness(owner, repo, branch, token, {
              force: true,
            });
            return { message: "File cache reconciled." };
          case "clear-file-cache":
            await clearFileCache(owner, repo, branch);
            await deleteCacheFileMeta(owner, repo, branch);
            await upsertCacheFileMeta(owner, repo, branch, {
              commitSha: null,
              status: "ok",
              error: null,
            });
            return { message: "File cache cleared." };
          case "refresh-config":
            await getConfig(owner, repo, branch, {
              sync: true,
              getToken: async () => token,
              ttlMs: 0,
            });
            return { message: "Config cache refreshed." };
          case "clear-config-cache":
            await db
              .delete(configTable)
              .where(
                and(
                  sql`lower(${configTable.owner}) = lower(${owner})`,
                  sql`lower(${configTable.repo}) = lower(${repo})`,
                  eq(configTable.branch, branch)
                )
              );
            return { message: "Config cache cleared." };
          case "clear-all-cache":
            await clearFileCache(owner, repo, branch);
            await deleteCacheFileMeta(owner, repo, branch);
            await upsertCacheFileMeta(owner, repo, branch, {
              commitSha: null,
              status: "ok",
              error: null,
            });
            await db
              .delete(configTable)
              .where(
                and(
                  sql`lower(${configTable.owner}) = lower(${owner})`,
                  sql`lower(${configTable.repo}) = lower(${repo})`,
                  eq(configTable.branch, branch)
                )
              );
            return { message: "All cache cleared." };
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),
});
