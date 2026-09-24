/**
 * Project cleanup helper shared by the CMS. Projects are created by the import
 * flow (a user's own repo) — there is no org-wide auto-sync anymore.
 */

import { inArray } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import {
  hubBlogPost,
  hubCollaborator,
  hubSubscription,
} from "@workspace/drizzle/schema";

/**
 * Delete every project-scoped row (blog posts, subscription, collaborators) for
 * the given repos — but NOT the hub_project rows themselves. App-level cascade —
 * the hub DB has no FK cascade because hub_project.repo_id is a unique index,
 * not a constraint.
 */
const deleteProjectChildRows = async (repoIds: number[]) => {
  if (!repoIds.length) return;
  await db.delete(hubBlogPost).where(inArray(hubBlogPost.repoId, repoIds));
  await db.delete(hubSubscription).where(inArray(hubSubscription.repoId, repoIds));
  await db.delete(hubCollaborator).where(inArray(hubCollaborator.repoId, repoIds));
};

export { deleteProjectChildRows };
