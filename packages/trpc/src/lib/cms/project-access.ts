import "server-only";

import { and, eq } from "drizzle-orm";

import { agencyClient, type CollaboratorRole } from "@workspace/drizzle/schema";

import { isAdminUser } from "../authz-shared";
import { collaboratorMatchesUserForRepoId } from "./collaborator-access";
import { db } from "./db";

// The one rule for who may open a project and with which role. Everything
// GitHub-side runs on the repo's GitHub App installation token, so this is
// purely about who the hub lets in:
//   - owner: the user who imported the repo, or the agency client who owns
//     the site (agency_client.userId); full access, like an admin
//   - invited collaborators: their hub_collaborator role
//   - anyone else: no access

type ProjectRef = { repoId: number; githubConnectedUserId: string | null };

const isProjectOwner = async (
  userId: string,
  project: ProjectRef
): Promise<boolean> => {
  if (project.githubConnectedUserId === userId) return true;
  const agencyOwner = await db.query.agencyClient.findFirst({
    where: and(
      eq(agencyClient.repoId, project.repoId),
      eq(agencyClient.userId, userId)
    ),
    columns: { id: true },
  });
  return Boolean(agencyOwner);
};

/** The user's role on the project, or null when they have no access. */
const resolveProjectRole = async (
  user: { id: string; email: string; role?: string | null; isAdmin?: boolean },
  project: ProjectRef
): Promise<CollaboratorRole | null> => {
  if (isAdminUser(user) || (await isProjectOwner(user.id, project))) {
    return "full-access";
  }
  const collaborator = await db.query.hubCollaborator.findFirst({
    where: collaboratorMatchesUserForRepoId(user, project.repoId),
  });
  return collaborator?.role ?? null;
};

export { isProjectOwner, resolveProjectRole };
