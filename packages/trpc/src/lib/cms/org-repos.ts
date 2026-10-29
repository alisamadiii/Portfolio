/**
 * Project cleanup helper shared by the CMS. Projects are created by the import
 * flow (a user's own repo) — there is no org-wide auto-sync anymore.
 */

import { and, inArray, notInArray, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import {
  hubCacheFile,
  hubCacheFileMeta,
  hubCollaborator,
  hubCollaboratorInvite,
  hubConfig,
  hubProject,
  subscriptions,
} from "@workspace/drizzle/schema";

/**
 * Delete every project-scoped row for the given projects — but NOT the
 * hub_project rows themselves (those are tombstoned to block re-sync).
 * App-level cascade: child tables carry project_id without an FK.
 *
 *  - by projectId: subscription, collaborators, pending invites
 *  - by owner/repo (all branches): config + GitHub content cache rows
 */
const deleteProjectChildRows = async (
  projects: Array<{ projectId: string; owner: string; repo: string }>
) => {
  if (!projects.length) return;
  const projectIds = projects.map((p) => p.projectId);

  await db
    .delete(subscriptions)
    .where(inArray(sql`${subscriptions.metadata} ->> 'projectId'`, projectIds));
  await db
    .delete(hubCollaborator)
    .where(inArray(hubCollaborator.projectId, projectIds));
  await db
    .delete(hubCollaboratorInvite)
    .where(inArray(hubCollaboratorInvite.projectId, projectIds));

  // Config + content cache are keyed owner/repo/branch — drop all branches for
  // each project's slug, unless another project still uses the same repo.
  for (const { owner, repo } of projects) {
    const [shared] = await db
      .select({ id: hubProject.id })
      .from(hubProject)
      .where(
        and(
          sql`lower(${hubProject.owner}) = lower(${owner})`,
          sql`lower(${hubProject.repo}) = lower(${repo})`,
          notInArray(hubProject.id, projectIds)
        )
      )
      .limit(1);
    if (shared) continue;
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
