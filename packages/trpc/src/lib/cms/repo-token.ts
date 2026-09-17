/**
 * Which GitHub token to use for a repo.
 *
 * Org repos (under GITHUB_ORG) use the single org PAT. Self-deployed projects —
 * a user's own repo imported from the Integrations/Import flow — live outside
 * the org, so the org PAT can't read or write them; those use the project
 * owner's connected GitHub OAuth token (account table, "repo" scope).
 *
 * One place for the rule so getToken (editor reads + commits) and the push
 * webhook cache refetch stay in sync.
 */

import { sql } from "drizzle-orm";

import { hubProject } from "@workspace/drizzle/schema";

import { getIntegrationAccessToken } from "@workspace/trpc/lib/integrations";
import { db } from "./db";
import { getGithubEnv } from "./org-repos";

/**
 * The GitHub access token for `owner/repo`. Self-deployed → the project owner's
 * token (falls back to `callerId` when the stored owner id is missing); every
 * other repo → the org PAT.
 */
export async function resolveRepoToken(
  owner: string,
  repo: string,
  callerId?: string
): Promise<string> {
  const [project] = await db
    .select({
      selfDeployed: hubProject.selfDeployed,
      githubConnectedUserId: hubProject.githubConnectedUserId,
    })
    .from(hubProject)
    .where(
      sql`lower(${hubProject.owner}) = lower(${owner}) and lower(${hubProject.repo}) = lower(${repo})`
    )
    .limit(1);

  const { token: orgToken, org } = getGithubEnv();
  // Org repos use the org PAT. Anything else — a self-deployed project or a repo
  // under a client's account the user was given access to — is unreachable by the
  // org PAT, so use the accessing user's own GitHub token.
  const isOrgRepo =
    owner.toLowerCase() === org.toLowerCase() && !project?.selfDeployed;
  if (!isOrgRepo) {
    const userId = project?.githubConnectedUserId ?? callerId;
    if (userId) {
      return getIntegrationAccessToken(userId, "github", "GitHub");
    }
  }

  return orgToken;
}
