import { TRPCError } from "@trpc/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { strToU8, zipSync } from "fflate";

import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

import { getImport } from "../content-pilot";
import { isUniqueViolation } from "../db-errors";
import { signImportToken } from "./edit-token";
import { syntheticRepoId, uploadSlug } from "./upload-slug";

// ─── Upload (no-GitHub) projects ────────────────────────────────
// Shared by deploy.importUpload/finalizeUpload (browser zip upload) and the
// agency starter project (server-side zip of a placeholder index.html).

const importSecret = () => {
  const secret = process.env.EDIT_TOKEN_SECRET;
  if (!secret) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Uploads are not configured on this server.",
    });
  }
  return secret;
};

/**
 * Reserve a hidden upload project row + mint its one-time import token.
 * `repoId` pins the id (an agency client's existing synthetic tenant id);
 * otherwise a fresh synthetic id is drawn per attempt.
 */
export async function reserveUploadProject(userId: string, name: string, repoId?: number) {
  const secret = importSecret();
  const base = uploadSlug(name);

  // Uniquify against uq_hub_project_owner_repo_ci under the 'uploads'
  // pseudo-owner, then insert with a synthetic repoId. Retried on the rare
  // id collision (uq_hub_project_repo_id).
  for (let attempt = 0; attempt < 5; attempt++) {
    const repo = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const id = repoId ?? syntheticRepoId();
    // A deleted upload project left before hard deletes existed still
    // holds its name as a tombstone (hidden, no owner). Uploads never
    // re-sync, so reclaim the name. A reserved in-progress import is also
    // hidden but keeps its owner, so it's never touched.
    await db
      .delete(hubProject)
      .where(
        and(
          eq(hubProject.source, "upload"),
          eq(hubProject.owner, "uploads"),
          sql`lower(${hubProject.repo}) = lower(${repo})`,
          eq(hubProject.hidden, true),
          isNull(hubProject.githubConnectedUserId)
        )
      );
    try {
      await db.insert(hubProject).values({
        repoId: id,
        source: "upload",
        owner: "uploads",
        repo,
        private: true,
        defaultBranch: "main",
        githubUpdatedAt: new Date(),
        syncedAt: new Date(),
        githubConnectedUserId: userId,
        hidden: true,
      });
      return { repoId: id, name: repo, importToken: signImportToken({ repoId: id }, secret) };
    } catch (error) {
      // Unique violation on owner/repo or repoId — try the next suffix/id.
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw new TRPCError({
    code: "CONFLICT",
    message: "Could not reserve a project name. Try a different name.",
  });
}

/** Verify the workspace landed on content-pilot, then reveal the row. */
export async function finalizeUploadProject(repoId: number) {
  const status = await getImport(repoId);
  if (!status.exists) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The upload did not reach the preview server. Try again.",
    });
  }
  await db
    .update(hubProject)
    .set({
      hidden: false,
      githubUpdatedAt: new Date(),
      syncedAt: new Date(),
    })
    .where(eq(hubProject.repoId, repoId));
}

/** Drop a reserved-but-never-finalized row so the name frees up. */
export async function cancelUploadProject(repoId: number) {
  // Hard-delete only hidden rows — a visible project goes through
  // project.delete (billing settle + pilot cleanup).
  await db
    .delete(hubProject)
    .where(
      and(
        eq(hubProject.repoId, repoId),
        eq(hubProject.source, "upload"),
        eq(hubProject.hidden, true)
      )
    );
}

/**
 * A one-page placeholder site for an agency client with no website yet, so
 * every agency lives inside a project. Owned by the client's user. Pass the
 * client's existing tenant id as `repoId` to keep its leads/subscription keyed.
 */
export async function createStarterProject(input: {
  userId: string;
  name: string;
  repoId?: number;
}) {
  const pilotUrl = (process.env.CONTENT_PILOT_URL ?? "").replace(/\/$/, "");
  if (!pilotUrl) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "CONTENT_PILOT_URL is not set.",
    });
  }
  const reserved = await reserveUploadProject(input.userId, input.name, input.repoId);
  try {
    const zip = zipSync({ "index.html": strToU8(starterHtml(input.name)) });
    const res = await fetch(
      `${pilotUrl}/api/v1/imports?repoId=${reserved.repoId}&name=${encodeURIComponent(reserved.name)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${reserved.importToken}`,
          "Content-Type": "application/zip",
        },
        body: zip,
      }
    );
    if (!res.ok) {
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: `Starter site upload failed (${res.status}).`,
      });
    }
    await finalizeUploadProject(reserved.repoId);
    return { repoId: reserved.repoId, name: reserved.name };
  } catch (error) {
    await cancelUploadProject(reserved.repoId);
    throw error;
  }
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const starterHtml = (name: string) => {
  const title = escapeHtml(name);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, sans-serif; background: #faf8f5; color: #1c1b19; }
  main { text-align: center; padding: 24px; }
  h1 { font-size: clamp(32px, 6vw, 56px); margin: 0 0 12px; }
  p { font-size: 18px; color: #6b6760; margin: 0; }
</style>
</head>
<body>
<main>
  <h1>${title}</h1>
  <p>Our new website is coming soon.</p>
</main>
</body>
</html>
`;
};
