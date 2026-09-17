/**
 * Which GitHub token to use for a repo.
 *
 * Every project is dynamic: reads and commits use the accessing user's own
 * GitHub OAuth token (account table, "repo" scope). The editing user (callerId)
 * is preferred so each collaborator commits as themselves; the stored project
 * owner (githubConnectedUserId) backstops the caller-less webhook path.
 *
 * One place for the rule so getToken (editor reads + commits) and the push
 * webhook cache refetch stay in sync.
 */

import { sql } from "drizzle-orm";

import { hubProject } from "@workspace/drizzle/schema";

import {
  getIntegrationAccessToken,
  reconnectError,
} from "@workspace/trpc/lib/integrations";
import { db } from "./db";

/**
 * The GitHub access token for `owner/repo`: the editing user's token, falling
 * back to the stored project owner's when there's no caller (the webhook path).
 * Throws a reconnect error when no GitHub is connected.
 */
export async function resolveRepoToken(
  owner: string,
  repo: string,
  callerId?: string
): Promise<string> {
  const [project] = await db
    .select({ githubConnectedUserId: hubProject.githubConnectedUserId })
    .from(hubProject)
    .where(
      sql`lower(${hubProject.owner}) = lower(${owner}) and lower(${hubProject.repo}) = lower(${repo})`
    )
    .limit(1);

  const userId = callerId ?? project?.githubConnectedUserId;
  if (!userId) throw reconnectError("GitHub");
  return getIntegrationAccessToken(userId, "github", "GitHub");
}
