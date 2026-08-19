/**
 * Token helper functions.
 *
 * All GitHub calls use a single org PAT owned by the portfolio app, read
 * straight from the environment (the engine now runs in-process — no more
 * server-to-server hop). Authorization stays local: admins get access to
 * every org repo, other users need a collaborator row for the repo.
 */

import { cache } from "react";

import { hasAdminAccess } from "./admin";
import { collaboratorMatchesUserForRepo } from "./collaborator-access";
import { db } from "./db";
import { createHttpError } from "./errors";
import { getGithubEnv } from "./org-repos";
import { User } from "./types";

// Get the org PAT from the environment.
const getPatToken = async () => {
  const { token } = getGithubEnv();
  return token;
};

// Get a token for a user: admins access any repo, others need a collaborator row.
const getToken = cache(
  async (
    user: User,
    owner: string,
    repo: string,
    _verifyGithubAccess: boolean = false
  ) => {
    if (hasAdminAccess(user)) {
      return {
        token: await getPatToken(),
        source: "pat" as const,
        role: "full-access" as const,
      };
    }

    const permission = await db.query.cmsCollaborator.findFirst({
      where: collaboratorMatchesUserForRepo(user, owner, repo),
    });
    if (permission) {
      return {
        token: await getPatToken(),
        source: "pat" as const,
        role: permission.role,
      };
    }

    throw createHttpError(
      `You do not have permission to access "${owner}/${repo}".`,
      403
    );
  }
);

export { getPatToken, getToken };
