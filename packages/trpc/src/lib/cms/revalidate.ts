import { and, eq, sql } from "drizzle-orm";

import { configTable, db } from "./db";
import { clearFileCache, getBranchHeadSha } from "./github-cache-file";
import {
  deleteCacheFileMeta,
  getCacheFileMeta,
  upsertCacheFileMeta,
} from "./github-cache-meta";

/**
 * Reconcile a repo's CMS cache with the live branch HEAD, cheaply, when a
 * project is opened. Replaces the old push-webhook: instead of GitHub pushing
 * us invalidations (which needed repo-admin to register), we pull the branch
 * head SHA (one API call, 15s-memoized) and, if it moved since we last cached,
 * clear the file + config cache so the next reads refetch fresh. When the SHA
 * is unchanged it's a no-op. Best-effort: any failure is swallowed so opening a
 * project never blocks on a GitHub hiccup.
 */
export async function revalidateRepoCache(
  owner: string,
  repo: string,
  branch: string,
  token: string
): Promise<void> {
  try {
    const head = await getBranchHeadSha(owner, repo, branch, token);
    if (!head) return;

    const meta = await getCacheFileMeta(owner, repo, branch);
    if (meta?.commitSha === head) return; // cache already at HEAD

    // Branch moved (or nothing cached yet) — clear file + config cache and
    // record the new head so subsequent opens fast-path until the next push.
    await clearFileCache(owner, repo, branch);
    await deleteCacheFileMeta(owner, repo, branch);
    await upsertCacheFileMeta(owner, repo, branch, {
      commitSha: head,
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
  } catch {
    // Best-effort: stale-but-present cache is fine; the 5-min reconcile and the
    // next open will catch up.
  }
}
