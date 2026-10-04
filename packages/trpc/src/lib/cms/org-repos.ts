/**
 * Project cleanup helper shared by the CMS. Projects are created by the import
 * flow (a user's own repo) — there is no org-wide auto-sync anymore.
 */

import { inArray } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { hubCollaborator, subscriptions } from "@workspace/drizzle/schema";

/**
 * Delete every project-scoped row (subscription, collaborators) for the given
 * repos — but NOT the hub_project rows themselves. App-level cascade — the hub
 * DB has no FK cascade because hub_project.repo_id is a unique index, not a
 * constraint.
 */
const deleteProjectChildRows = async (repoIds: number[]) => {
  if (!repoIds.length) return;
  await db.delete(subscriptions).where(inArray(subscriptions.repoId, repoIds));
  await db.delete(hubCollaborator).where(inArray(hubCollaborator.repoId, repoIds));
};

export { deleteProjectChildRows };
