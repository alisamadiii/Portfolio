import "server-only";

import type { CollaboratorRole } from "@workspace/drizzle/schema";
import type { User } from "./types";

import { sql } from "drizzle-orm";

import { createHttpError } from "./errors";
import { isAdminUser, roleAtLeast } from "./authz-shared";
import { collaboratorMatchesUserForRepo } from "./collaborator-access";
import { db, orgRepoTable } from "./db";
import { getPatToken } from "./token";
import { createOctokitInstance } from "./octokit";

// Repo lookup with the org PAT (404s if the PAT can't see the repo).
const getRepoAccess = async (owner: string, repo: string) => {
  const token = await getPatToken();
  const octokit = createOctokitInstance(token);
  const response = await octokit.rest.repos.get({ owner, repo });

  const repoAccess = {
    repoId: response.data.id,
    ownerLogin: response.data.owner.login,
    repoName: response.data.name,
    ownerType: response.data.owner.type === "User" ? "user" : "org",
  };

  return { token, repoAccess };
};

// Repo lookup from the synced org catalog — no GitHub, no PAT. Collaborator
// invites are CMS-dashboard-only (nothing is sent to GitHub), and the hub app
// that runs them has no GITHUB_* env, so this must stay DB-only.
const getRepoAccessFromDb = async (owner: string, repo: string) => {
  const row = await db.query.cmsOrgRepo.findFirst({
    where: sql`lower(${orgRepoTable.owner}) = lower(${owner}) and lower(${orgRepoTable.repo}) = lower(${repo})`,
  });
  if (!row) throw createHttpError("Repository not found.", 404);

  return {
    repoId: row.repoId,
    ownerLogin: row.owner,
    repoName: row.repo,
    ownerType: "org",
  };
};

// Admin-gated repo access with the org PAT.
const requireAdminRepoAccess = async (
  user: Pick<User, "id" | "role"> & { isAdmin?: boolean },
  owner: string,
  repo: string,
  message = "Admin access required."
) => {
  if (!isAdminUser(user)) {
    throw createHttpError(message, 403);
  }

  return getRepoAccess(owner, repo);
};

// Collaborator management: admins or full-access collaborators of the repo.
// DB-only on purpose — invites live in the CMS dashboard, never on GitHub.
const requireCollaboratorManageAccess = async (
  user: Pick<User, "id" | "email" | "role"> & { isAdmin?: boolean },
  owner: string,
  repo: string
) => {
  const isActorAdmin = isAdminUser(user);

  if (!isActorAdmin) {
    const row = await db.query.cmsCollaborator.findFirst({
      where: collaboratorMatchesUserForRepo(user, owner, repo),
    });
    if (row?.role !== "full-access") {
      throw createHttpError(
        "Only admins or full-access collaborators can manage collaborators.",
        403
      );
    }
  }

  const repoAccess = await getRepoAccessFromDb(owner, repo);
  return { repoAccess, isActorAdmin };
};

const assertWriteAccess = (
  role: CollaboratorRole,
  message = "You have view-only access."
) => {
  if (!roleAtLeast(role, "content-editor")) {
    throw createHttpError(message, 403);
  }
};

const assertFullAccess = (
  role: CollaboratorRole,
  message = "Full access required."
) => {
  if (role !== "full-access") {
    throw createHttpError(message, 403);
  }
};

export {
  assertFullAccess,
  assertWriteAccess,
  requireAdminRepoAccess,
  requireCollaboratorManageAccess,
};
