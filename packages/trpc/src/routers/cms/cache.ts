import { and, eq, sql } from "drizzle-orm";
import z from "zod";

import {
  authenticatedProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";

import { isCacheEnabled } from "@workspace/cms-core/config";
import { requireAdminRepoAccess } from "@workspace/trpc/lib/cms/authz";
import { getConfig } from "@workspace/trpc/lib/cms/config-store";
import {
  cacheFileTable,
  configTable,
  db,
} from "@workspace/trpc/lib/cms/db";
import { createHttpError, runCms } from "@workspace/trpc/lib/cms/errors";
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
import type { User } from "@workspace/trpc/lib/cms/types";

const branchInput = z.object({
  owner: z.string(),
  repo: z.string(),
  branch: z.string(),
});

// Shared preamble of both cache procedures: admin repo access + cache enabled.
const requireCacheAccess = async (
  user: User,
  owner: string,
  repo: string,
  branch: string,
  message: string
) => {
  const { token } = await requireAdminRepoAccess(user, owner, repo, message);

  const config = await getConfig(owner, repo, branch, {
    sync: true,
    getToken: async () => token,
    backgroundRefreshWhenStale: true,
  });
  if (!config?.object || !isCacheEnabled(config.object)) {
    throw createHttpError("Cache is disabled for this repository.", 403);
  }

  return { token };
};

/** Cache dashboard data. Port of GET /api/[owner]/[repo]/[branch]/cache. */
const status = authenticatedProcedure
  .input(branchInput)
  .query(async ({ input, ctx }) =>
    runCms(async () => {
      const { owner, repo, branch } = input;

      const { token } = await requireCacheAccess(
        ctx.session.user,
        owner,
        repo,
        branch,
        "Only admins can view cache status."
      );

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
      const cachedConfig = await db.query.cmsConfig.findFirst({
        where: and(
          sql`lower(${configTable.owner}) = lower(${owner})`,
          sql`lower(${configTable.repo}) = lower(${repo})`,
          eq(configTable.branch, branch)
        ),
      });
      const branchHeadSha = await getBranchHeadSha(owner, repo, branch, token);

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
    })
  );

/** Cache maintenance actions. Port of POST /api/[owner]/[repo]/[branch]/cache. */
const action = authenticatedProcedure
  .input(
    branchInput.extend({
      action: z.enum([
        "reconcile-file-cache",
        "clear-file-cache",
        "refresh-config",
        "clear-config-cache",
        "clear-all-cache",
      ]),
    })
  )
  .mutation(async ({ input, ctx }) =>
    runCms(async () => {
      const { owner, repo, branch } = input;

      const { token } = await requireCacheAccess(
        ctx.session.user,
        owner,
        repo,
        branch,
        "Only admins can manage cache."
      );

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
    })
  );

const cacheRouter = createTRPCRouter({
  status,
  action,
});

export { cacheRouter };
