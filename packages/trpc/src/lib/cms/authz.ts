import "server-only";

import type { CollaboratorRole } from "@workspace/drizzle/schema";
import type { User } from "./types";

import { createHttpError } from "./errors";
import { isAdminUser, roleAtLeast } from "./authz-shared";
import { collaboratorMatchesUserForRepo } from "./collaborator-access";
import { db } from "./db";
import { getPatToken } from "./token";
import { createOctokitInstance } from "./octokit";

// Repo lookup with the org PAT (404s if the PAT can't see the repo).
const getRepoAccess = async (owner: string, repo: string) => {
  const token = await getPatToken();
  const octokit = createOctokitInstance(token);
  const response = await octokit.rest.repos.get({ owner, repo });

  const repoAccess = {
    repoId: response.data.id,
    ownerId: response.data.owner.id,
    ownerLogin: response.data.owner.login,
    repoName: response.data.name,
    ownerType: response.data.owner.type === "User" ? "user" : "org",
  };

  return { token, repoAccess };
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

  const { token, repoAccess } = await getRepoAccess(owner, repo);
  return { token, repoAccess, isActorAdmin };
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
