import type { Config } from "@/types/config";
import type { User } from "@/types/user";

import { createHttpError } from "@/lib/api-error";
import { getConfig } from "@/lib/config-store";
import { requireApiUserSession } from "@/lib/session-server";
import { getToken } from "@/lib/token";

type RepoRef = {
  owner: string;
  repo: string;
  branch: string;
};

type RepoReadContext = {
  user: User;
  token: string;
  config: Config;
};

const getRepoReadContext = async ({
  owner,
  repo,
  branch,
}: RepoRef): Promise<RepoReadContext> => {
  const sessionResult = await requireApiUserSession();
  if ("response" in sessionResult) {
    throw createHttpError(
      "Not signed in.",
      sessionResult.response?.status ?? 401
    );
  }

  const user = sessionResult.user as User;
  const { token } = await getToken(user, owner, repo);
  if (!token) throw createHttpError("Token not found", 401);

  const config = await getConfig(owner, repo, branch, {
    getToken: async () => token,
  });
  if (!config)
    throw createHttpError(
      `Configuration not found for ${owner}/${repo}/${branch}.`,
      404
    );

  return { user, token, config };
};

export { getRepoReadContext };
