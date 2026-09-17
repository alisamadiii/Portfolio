/**
 * Token helper functions.
 *
 * Org repos use a single org PAT owned by the portfolio app, read straight from
 * the environment. Self-deployed repos (a user's own imported repo, outside
 * GITHUB_ORG) use the project owner's connected GitHub token instead — the org
 * PAT can't reach them. Authorization stays local: admins access every repo,
 * the self-deployed project owner gets full access to their own project, and
 * everyone else needs a collaborator row.
 */

import { cache } from "react";

import { and, eq, sql } from "drizzle-orm";

import { hubProject } from "@workspace/drizzle/schema";

import { isAdminUser } from "../authz-shared";
import { collaboratorMatchesUserForRepo } from "./collaborator-access";
import { db } from "./db";
import { createHttpError } from "./errors";
import { getGithubEnv } from "./org-repos";
import { resolveRepoToken } from "./repo-token";

// Get the org PAT from the environment.
const getPatToken = async () => {
  const { token } = getGithubEnv();
  return token;
};

// Get a token for a user: admins access any repo, the self-deployed project
// owner accesses their own, others need a collaborator row. The token itself is
// resolved per-repo (org PAT vs the project owner's GitHub token).
const getToken = cache(
  async (
    user: { id: string; email: string; role?: string | null },
    owner: string,
    repo: string,
    _verifyGithubAccess: boolean = false
  ) => {
    const token = await resolveRepoToken(owner, repo, user.id);
    const source = token === (await getPatToken()) ? "pat" : "user";

    if (isAdminUser(user)) {
      return { token, source: source as "pat" | "user", role: "full-access" as const };
    }

    // The connecting user has full access to their own self-deployed project.
    const [project] = await db
      .select({
        selfDeployed: hubProject.selfDeployed,
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
    if (project?.selfDeployed && project.githubConnectedUserId === user.id) {
      return { token, source: source as "pat" | "user", role: "full-access" as const };
    }

    const permission = await db.query.hubCollaborator.findFirst({
      where: collaboratorMatchesUserForRepo(user, owner, repo),
    });
    if (permission) {
      return { token, source: source as "pat" | "user", role: permission.role };
    }

    throw createHttpError(
      `You do not have permission to access "${owner}/${repo}".`,
      403
    );
  }
);

export { getPatToken, getToken };
