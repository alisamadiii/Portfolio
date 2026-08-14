import type { Config } from "@workspace/cms-core/types/config";

import { getConfig } from "./config-store";
import { createHttpError } from "./errors";
import { getToken } from "./token";
import type { User } from "./types";

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

/**
 * Resolve the read context (token + config) for a repo/branch on behalf of a
 * user. Session resolution is the caller's job: hub API routes pass the user
 * from `requireApiUserSession`, tRPC routers pass `ctx.session.user`.
 */
const getRepoReadContext = async (
  { owner, repo, branch }: RepoRef,
  user: User
): Promise<RepoReadContext> => {
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
