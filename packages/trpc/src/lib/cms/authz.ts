import "server-only";

import { sql } from "drizzle-orm";

import { createHttpError } from "./errors";
import { isAdminUser } from "../authz-shared";
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
  const row = await db.query.hubProject.findFirst({
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

// Collaborator management: admins or full-access collaborators of the repo.
// DB-only on purpose — invites live in the CMS dashboard, never on GitHub.
// Also used directly by hub's collaborator server actions, so it can't fold
// into the tRPC procedure that wraps it.
const requireCollaboratorManageAccess = async (
  user: { id: string; email: string; role?: string | null; isAdmin?: boolean },
  owner: string,
  repo: string
) => {
  const isActorAdmin = isAdminUser(user);

  if (!isActorAdmin) {
    const row = await db.query.hubCollaborator.findFirst({
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

export { getRepoAccess, requireCollaboratorManageAccess };
