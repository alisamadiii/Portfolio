import { type NextRequest } from "next/server";
import { and, sql } from "drizzle-orm";
import { db } from "@/db";
import { configTable } from "@/db/schema";
import { getBasePath, setBasePath } from "@/lib/repo-settings";
import { clearFileCache } from "@/lib/github-cache-file";
import { deleteCacheFileMeta } from "@/lib/github-cache-meta";
import { assertGithubIdentity } from "@/lib/authz-shared";
import { getToken } from "@/lib/token";
import { createHttpError, toErrorResponse } from "@/lib/api-error";
import { requireApiUserSession } from "@/lib/session-server";

/**
 * Get or set the per-repository base path (monorepo subfolder support).
 *
 * GET  /api/[owner]/[repo]/base-path
 * PUT  /api/[owner]/[repo]/base-path   body: { basePath: string }
 *
 * Requires a GitHub identity and access to the repository. Never reads the
 * config, so it works even when `.pages.yml` doesn't exist yet.
 */

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const params = await context.params;
    const sessionResult = await requireApiUserSession();
    if ("response" in sessionResult) return sessionResult.response;
    const user = sessionResult.user;

    assertGithubIdentity(user, "Only GitHub users can manage the base path.");

    const { token } = await getToken(user, params.owner, params.repo, true);
    if (!token) throw createHttpError("Token not found", 401);

    const basePath = await getBasePath(params.owner, params.repo);

    return Response.json({
      status: "success",
      data: { basePath },
    });
  } catch (error: any) {
    console.error(error);
    return toErrorResponse(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const params = await context.params;
    const sessionResult = await requireApiUserSession();
    if ("response" in sessionResult) return sessionResult.response;
    const user = sessionResult.user;

    assertGithubIdentity(user, "Only GitHub users can manage the base path.");

    const { token } = await getToken(user, params.owner, params.repo, true);
    if (!token) throw createHttpError("Token not found", 401);

    const body: any = await request.json().catch(() => ({}));
    if (typeof body?.basePath !== "string") {
      throw createHttpError('"basePath" is required and must be a string.', 400);
    }

    const basePath = await setBasePath(params.owner, params.repo, body.basePath);

    // The base path changes both where `.pages.yml` loads from and how every
    // collection/media path is rebased, so all cached data for ALL branches of
    // this repo is now stale. Clear it so the next load re-resolves from GitHub.
    await db.delete(configTable).where(
      and(
        sql`lower(${configTable.owner}) = lower(${params.owner})`,
        sql`lower(${configTable.repo}) = lower(${params.repo})`,
      ),
    );
    await clearFileCache(params.owner, params.repo);
    await deleteCacheFileMeta(params.owner, params.repo);

    return Response.json({
      status: "success",
      message: "Base path updated.",
      data: { basePath },
    });
  } catch (error: any) {
    console.error(error);
    return toErrorResponse(error);
  }
}
