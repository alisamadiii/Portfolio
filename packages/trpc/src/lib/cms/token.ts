/**
 * Token helper functions.
 *
 * Every repo is read/committed with the accessing user's own GitHub token
 * (resolved per-repo by resolveRepoToken). Authorization stays local: admins
 * access every repo, the user who connected GitHub for a project gets full
 * access to it, and everyone else needs a collaborator row.
 */

import { cache } from "react";

import { and, eq, sql } from "drizzle-orm";

import { hubProject } from "@workspace/drizzle/schema";

import { isAdminUser } from "../authz-shared";
import { collaboratorMatchesUserForRepo } from "./collaborator-access";
import { db } from "./db";
import { createHttpError } from "./errors";
import { resolveRepoToken } from "./repo-token";

// Get a token for a user: admins access any repo, the user who connected GitHub
// for a project accesses it, others need a collaborator row. The token itself is
// the accessing user's GitHub OAuth token, resolved per-repo.
const getToken = cache(
  async (
    user: { id: string; email: string; role?: string | null },
    owner: string,
    repo: string,
    _verifyGithubAccess: boolean = false
  ) => {
    const token = await resolveRepoToken(owner, repo, user.id);

    if (isAdminUser(user)) {
      return { token, source: "user" as const, role: "full-access" as const };
    }

    // The user who connected GitHub for this project has full access to it.
    const [project] = await db
      .select({
        githubConnectedUserId: hubProject.githubConnectedUserId,
      })
      .from(hubProject)
      .where(
        and(
          sql`lower(${hubProject.owner}) = lower(${owner})`,
          sql`lower(${hubProject.repo}) = lower(${repo})`,
          eq(hubProject.hidden, false)
        )
      )
      .limit(1);
    if (project?.githubConnectedUserId === user.id) {
      return { token, source: "user" as const, role: "full-access" as const };
    }

    const permission = await db.query.hubCollaborator.findFirst({
      where: collaboratorMatchesUserForRepo(user, owner, repo),
    });
    if (permission) {
      return { token, source: "user" as const, role: permission.role };
    }

    throw createHttpError(
      `You do not have permission to access "${owner}/${repo}".`,
      403
    );
  }
);

export { getToken };
