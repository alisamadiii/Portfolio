import { eq } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { githubInstallation } from "@workspace/drizzle/schema";

import { installationForRepo } from "./resolve-installation";

// ─── Commit attribution ──────────────────────────────────────────
// Sessions push with the installation token, but the git author is set to the
// human who installed the app (the project owner) via their GitHub noreply
// address. Services that license git contributors (Netlify) then see a known
// collaborator instead of our bot; GitHub renders the owner's avatar.

export type CommitAuthor = { name: string; email: string };

/**
 * The commit identity for a repo covered by the GitHub App: the installing
 * user when known (org installs), else the installation account itself (user
 * installs — account = owner). Null when no active installation covers the
 * repo; callers then let content-pilot fall back to its bot identity.
 */
export async function installationCommitAuthor(
  owner: string,
  repo: string
): Promise<CommitAuthor | null> {
  const covering = await installationForRepo(owner, repo).catch(() => null);
  if (!covering) return null;
  const [row] = await db
    .select({
      accountLogin: githubInstallation.accountLogin,
      accountId: githubInstallation.accountId,
      accountType: githubInstallation.accountType,
      senderLogin: githubInstallation.senderLogin,
      senderGithubId: githubInstallation.senderGithubId,
    })
    .from(githubInstallation)
    .where(eq(githubInstallation.installationId, covering.installationId))
    .limit(1);
  if (!row) return null;
  // Prefer the human who clicked install — on an org installation the account
  // itself is the org, which maps to no git contributor.
  const login =
    row.accountType === "Organization" && row.senderLogin
      ? row.senderLogin
      : row.accountLogin;
  const githubId =
    row.accountType === "Organization" && row.senderGithubId != null
      ? row.senderGithubId
      : row.accountId;
  if (!login) return null;
  return {
    name: login,
    email: `${githubId}+${login}@users.noreply.github.com`,
  };
}
