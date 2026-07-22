import "server-only";

import type { User } from "@/types/user";
import { isAdminUser } from "@/lib/authz-shared";
import { createHttpError } from "@/lib/api-error";
import { getPatToken } from "@/lib/token";
import { createOctokitInstance } from "@/lib/utils/octokit";

// Admin-gated repo access with the org PAT (repo lookup 404s if the PAT can't see it).
const requireAdminRepoAccess = async (
  user: Pick<User, "id" | "role"> & { isAdmin?: boolean },
  owner: string,
  repo: string,
  message = "Admin access required.",
) => {
  if (!isAdminUser(user)) {
    throw createHttpError(message, 403);
  }

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

export { requireAdminRepoAccess };
