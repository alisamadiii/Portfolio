import type { Config } from "@workspace/cms-core/types/config";

import { getConfig } from "./config-store";
import { createHttpError } from "./errors";
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
 * Resolve the read context (config) for a repo/branch. The caller supplies the
 * user and the already-resolved repo token — `cmsProcedure` injects both into
 * ctx, so routers no longer resolve the git token themselves.
 */
const getRepoReadContext = async (
  { owner, repo, branch }: RepoRef,
  user: User,
  token: string
): Promise<RepoReadContext> => {
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
