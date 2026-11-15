import "server-only";

import { eq } from "drizzle-orm";

import { createHttpError, toTRPCError } from "./errors";
import { isAdminUser } from "../authz-shared";
import { collaboratorMatchesUserForProjectId } from "./collaborator-access";
import { isProjectOwner, resolveProjectRole } from "./project-access";
import { db, orgRepoTable } from "./db";

// Repo lookup from the project catalog — no GitHub, no PAT. Keyed by projectId
// (the project's stable, globally-unique identity). Collaborator invites are
// CMS-dashboard-only (nothing is sent to GitHub), and the hub app that runs
// them has no GITHUB_* env, so this must stay DB-only.
const getRepoAccessByProjectId = async (projectId: string) => {
  const row = await db.query.hubProject.findFirst({
    where: eq(orgRepoTable.id, projectId),
  });
  if (!row) throw createHttpError("Repository not found.", 404);

  return {
    projectId: row.id,
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
  projectId: string
) => {
  const isActorAdmin = isAdminUser(user);
  const repoAccess = await getRepoAccessByProjectId(projectId);

  // The project's owner (importer or agency client) manages it like an
  // admin — full parity over collaborators.
  const isActorOwner = await isProjectOwner(user.id, repoAccess);

  if (!isActorAdmin && !isActorOwner) {
    const row = await db.query.hubCollaborator.findFirst({
      where: collaboratorMatchesUserForProjectId(user, projectId),
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
    projectId: string;
    githubConnectedUserId: string | null;
  }
) => {
  if (!(await resolveProjectRole(user, project))) {
    throw createHttpError("You do not have access to this project.", 403);
  }
};

// Same check keyed by projectId (used by billing endpoints that only
// carry a projectId). Returns the project row on success.
const assertRepoAccessByProjectId = async (
  user: { id: string; email: string; role?: string | null; isAdmin?: boolean },
  projectId: string
) => {
  const project = await db.query.hubProject.findFirst({
    where: eq(orgRepoTable.id, projectId),
  });
  if (!project) throw createHttpError("Project not found.", 404);
  await assertProjectAccess(user, {
    projectId: project.id,
    githubConnectedUserId: project.githubConnectedUserId,
  });
  return project;
};

// Owner-level actions (billing, deleting the project): admins or the
// project's owner only, never collaborators, whatever their role.
const isProjectOwnerOrAdmin = async (
  user: { id: string; email: string; role?: string | null; isAdmin?: boolean },
  projectId: string
): Promise<boolean> => {
  if (isAdminUser(user)) return true;
  const project = await db.query.hubProject.findFirst({
    where: eq(orgRepoTable.id, projectId),
    columns: { id: true, githubConnectedUserId: true },
  });
  if (!project) return false;
  return isProjectOwner(user.id, {
    projectId: project.id,
    githubConnectedUserId: project.githubConnectedUserId,
  });
};

const assertProjectOwnerOrAdmin = async (
  user: { id: string; email: string; role?: string | null; isAdmin?: boolean },
  projectId: string
) => {
  if (!(await isProjectOwnerOrAdmin(user, projectId))) {
    throw toTRPCError(createHttpError("Only the project owner can do this.", 403));
  }
};

export {
  assertProjectAccess,
  assertProjectOwnerOrAdmin,
  isProjectOwnerOrAdmin,
  assertRepoAccessByProjectId,
  getRepoAccessByProjectId,
  requireCollaboratorManageAccess,
};
