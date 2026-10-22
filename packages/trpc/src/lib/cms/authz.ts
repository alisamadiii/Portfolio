import "server-only";

import { eq } from "drizzle-orm";

import { createHttpError } from "./errors";
import { isAdminUser } from "../authz-shared";
import { collaboratorMatchesUserForRepoId } from "./collaborator-access";
import { isProjectOwner, resolveProjectRole } from "./project-access";
import { db, orgRepoTable } from "./db";

// Repo lookup from the project catalog — no GitHub, no PAT. Keyed by repoId
// (the project's stable, globally-unique identity). Collaborator invites are
// CMS-dashboard-only (nothing is sent to GitHub), and the hub app that runs
// them has no GITHUB_* env, so this must stay DB-only.
const getRepoAccessByRepoId = async (repoId: number) => {
  const row = await db.query.hubProject.findFirst({
    where: eq(orgRepoTable.repoId, repoId),
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

// Collaborator management: admins, the project's owner (see project-access),
// or full-access collaborators of the repo. DB-only on purpose —
// invites live in the CMS dashboard, never on GitHub.
const requireCollaboratorManageAccess = async (
  user: { id: string; email: string; role?: string | null; isAdmin?: boolean },
  repoId: number
) => {
  const isActorAdmin = isAdminUser(user);
  const repoAccess = await getRepoAccessByRepoId(repoId);

  // The project's owner (importer or agency client) manages it like an
  // admin — full parity over collaborators.
  const isActorOwner = await isProjectOwner(user.id, repoAccess);

  if (!isActorAdmin && !isActorOwner) {
    const row = await db.query.hubCollaborator.findFirst({
      where: collaboratorMatchesUserForRepoId(user, repoId),
    });
    if (row?.role !== "full-access") {
      throw createHttpError(
        "Only admins, the project owner, or full-access collaborators can manage collaborators.",
        403
      );
    }
  }

  return { repoAccess, isActorAdmin, isActorOwner };
};

// Can this user read/act on this project? See resolveProjectRole: admin,
// owner (importer or agency client) or any collaborator. Throws 403 if not.
const assertProjectAccess = async (
  user: { id: string; email: string; role?: string | null; isAdmin?: boolean },
  project: {
    repoId: number;
    githubConnectedUserId: string | null;
  }
) => {
  if (!(await resolveProjectRole(user, project))) {
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
  getRepoAccessByRepoId,
  requireCollaboratorManageAccess,
};
