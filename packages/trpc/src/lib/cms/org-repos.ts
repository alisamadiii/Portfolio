/**
 * Project cleanup helper shared by the CMS. Projects are created by the import
 * flow (a user's own repo) — there is no org-wide auto-sync anymore.
 */

import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import {
  hubCacheFile,
  hubCacheFileMeta,
  hubCollaborator,
  hubCollaboratorInvite,
  hubConfig,
  subscriptions,
} from "@workspace/drizzle/schema";

/**
 * Delete every project-scoped row for the given projects — but NOT the
 * hub_project rows themselves (those are tombstoned to block re-sync).
 * App-level cascade: the hub DB has no FK cascade because hub_project.repo_id
 * is a unique index, not a constraint.
 *
 *  - by repoId: subscription, collaborators, pending invites
 *  - by owner/repo (all branches): config + GitHub content cache rows
 */
const deleteProjectChildRows = async (
  projects: Array<{ repoId: number; owner: string; repo: string }>
) => {
  if (!projects.length) return;
  const repoIds = projects.map((p) => p.repoId);

  await db.delete(subscriptions).where(inArray(subscriptions.repoId, repoIds));
  await db
    .delete(hubCollaborator)
    .where(inArray(hubCollaborator.repoId, repoIds));
  await db
    .delete(hubCollaboratorInvite)
    .where(inArray(hubCollaboratorInvite.repoId, repoIds));

  // Config + content cache are keyed owner/repo/branch — drop all branches for
  // each project's slug.
  for (const { owner, repo } of projects) {
    const match = (table: typeof hubConfig | typeof hubCacheFile | typeof hubCacheFileMeta) =>
      and(
        sql`lower(${table.owner}) = lower(${owner})`,
        sql`lower(${table.repo}) = lower(${repo})`
      );
    await db.delete(hubConfig).where(match(hubConfig));
    await db.delete(hubCacheFile).where(match(hubCacheFile));
    await db.delete(hubCacheFileMeta).where(match(hubCacheFileMeta));
  }
};

export { deleteProjectChildRows };
