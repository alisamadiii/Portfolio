import { headers } from "next/headers";
import { type NextRequest } from "next/server";
import { and, sql } from "drizzle-orm";

import { db } from "@/db";
import { collaboratorTable } from "@/db/schema";

import { createHttpCaller } from "@workspace/trpc/http-caller";

import { toErrorResponse } from "@/lib/api-error";
import { isAdminUser } from "@/lib/authz-shared";
import { collaboratorMatchesUser } from "@/lib/collaborator-access";
import { requireApiUserSession } from "@/lib/session-server";

export const dynamic = "force-dynamic";

/**
 * Fetches repositories for a user.
 * Admins get the org repo list from the portfolio API (org PAT lives there);
 * other users only see repos they were invited to.
 *
 * GET /api/repos/[owner]
 *
 * Requires authentication.
 */

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ owner: string }> }
) {
  try {
    const params = await context.params;
    const sessionResult = await requireApiUserSession();
    if ("response" in sessionResult) return sessionResult.response;
    const user = sessionResult.user;

    let githubRepos: any[] = [];

    const keyword = request.nextUrl.searchParams.get("keyword") ?? undefined;
    const org = process.env.GITHUB_ORG;

    if (
      isAdminUser(user) &&
      org &&
      params.owner.toLowerCase() === org.toLowerCase()
    ) {
      const caller = createHttpCaller(await headers());
      githubRepos = await caller.cms.listRepos.query({ keyword });
    }

    const collaboratorRepos = await db.query.collaboratorTable.findMany({
      where: and(
        collaboratorMatchesUser(user),
        sql`lower(${collaboratorTable.owner}) = lower(${params.owner})`
      ),
    });

    const reposByKey = new Map<string, any>();
    for (const repo of githubRepos) {
      reposByKey.set(
        `${repo.owner.toLowerCase()}::${repo.repo.toLowerCase()}`,
        repo
      );
    }
    for (const repo of collaboratorRepos) {
      const key = `${repo.owner.toLowerCase()}::${repo.repo.toLowerCase()}`;
      if (!reposByKey.has(key)) {
        reposByKey.set(key, repo);
      }
    }

    const repos = Array.from(reposByKey.values());

    return Response.json({
      status: "success",
      data: repos,
    });
  } catch (error: any) {
    console.error(error);
    return toErrorResponse(error);
  }
}
