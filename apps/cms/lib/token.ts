/**
 * Token helper functions.
 *
 * All GitHub calls use a single org PAT owned by the portfolio app (the API
 * core). The CMS fetches it server-to-server via an internal tRPC procedure
 * and authorizes locally: admins get access to every org repo, other users
 * need a collaborator row for the repo.
 */

import { cache } from "react";

import { User } from "@/types/user";

import { db } from "@/db";

import { createInternalCaller } from "@workspace/trpc/http-caller";

import { hasAdminAccess } from "@/lib/admin";
import { createHttpError } from "@/lib/api-error";
import { collaboratorMatchesUserForRepo } from "@/lib/collaborator-access";

let patTokenCache: string | null = null;

// Get the org PAT from the portfolio app (cached for the process lifetime).
const getPatToken = async () => {
  if (patTokenCache) return patTokenCache;

  const caller = createInternalCaller();
  const { token } = await caller.cms.internal.getGithubToken.query();
  if (!token) throw new Error("GitHub token could not be retrieved.");

  patTokenCache = token;
  return token;
};

// Drop the cached PAT (e.g. after a 401 following a token rotation).
const clearPatTokenCache = () => {
  patTokenCache = null;
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
      };
    }

    const permission = await db.query.collaboratorTable.findFirst({
      where: collaboratorMatchesUserForRepo(user, owner, repo),
    });
    if (permission) {
      return {
        token: await getPatToken(),
        source: "pat" as const,
      };
    }

    throw createHttpError(
      `You do not have permission to access "${owner}/${repo}".`,
      403
    );
  }
);

export { getPatToken, clearPatTokenCache, getToken };
