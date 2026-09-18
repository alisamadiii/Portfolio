import "server-only";

import { eq, sql } from "drizzle-orm";

import { createHttpError } from "./errors";
import { isAdminUser } from "../authz-shared";
import { collaboratorMatchesUserForRepo } from "./collaborator-access";
import { db, orgRepoTable } from "./db";

// Repo lookup from the project catalog — no GitHub, no PAT. Collaborator
// invites are CMS-dashboard-only (nothing is sent to GitHub), and the hub app
// that runs them has no GITHUB_* env, so this must stay DB-only.
const getRepoAccessFromDb = async (owner: string, repo: string) => {
  const row = await db.query.hubProject.findFirst({
    where: sql`lower(${orgRepoTable.owner}) = lower(${owner}) and lower(${orgRepoTable.repo}) = lower(${repo})`,
  });
  if (!row) throw createHttpError("Repository not found.", 404);

  return {
    repoId: row.repoId,
    ownerLogin: row.owner,
    repoName: row.repo,
    ownerType: "org",
    githubConnectedUserId: row.githubConnectedUserId,
  };
};

// Collaborator management: admins, the user who imported the project (its
// owner), or full-access collaborators of the repo. DB-only on purpose —
// invites live in the CMS dashboard, never on GitHub.
const requireCollaboratorManageAccess = async (
  user: { id: string; email: string; role?: string | null; isAdmin?: boolean },
  owner: string,
  repo: string
) => {
  const isActorAdmin = isAdminUser(user);
  const repoAccess = await getRepoAccessFromDb(owner, repo);

  if (!isActorAdmin) {
    // The user who connected GitHub for this project manages it like an owner.
    const isOwner = repoAccess.githubConnectedUserId === user.id;
    if (!isOwner) {
      const row = await db.query.hubCollaborator.findFirst({
        where: collaboratorMatchesUserForRepo(user, owner, repo),
      });
      if (row?.role !== "full-access") {
        throw createHttpError(
          "Only admins, the project owner, or full-access collaborators can manage collaborators.",
          403
        );
      }
    }
  }

  return { repoAccess, isActorAdmin };
};

// Can this user read/act on this project? Admin, the importing owner
// (githubConnectedUserId), or any collaborator of the repo. Throws 403 if not.
const assertProjectAccess = async (
  user: { id: string; email: string; role?: string | null; isAdmin?: boolean },
  project: {
    owner: string;
    repo: string;
    githubConnectedUserId: string | null;
  }
) => {
  if (isAdminUser(user)) return;
  if (project.githubConnectedUserId && project.githubConnectedUserId === user.id)
    return;
  const collaborator = await db.query.hubCollaborator.findFirst({
    where: collaboratorMatchesUserForRepo(user, project.owner, project.repo),
  });
  if (!collaborator) {
    throw createHttpError("You do not have access to this project.", 403);
  }
};

// Same check keyed by the numeric repoId (used by billing endpoints that only
// carry a repoId). Returns the project row on success.
const assertRepoAccessByRepoId = async (
  user: { id: string; email: string; role?: string | null; isAdmin?: boolean },
  repoId: number
) => {
  const project = await db.query.hubProject.findFirst({
    where: eq(orgRepoTable.repoId, repoId),
  });
  if (!project) throw createHttpError("Project not found.", 404);
  await assertProjectAccess(user, project);
  return project;
};

export {
  assertProjectAccess,
  assertRepoAccessByRepoId,
  getRepoAccessFromDb,
  requireCollaboratorManageAccess,
};
