import { eq } from "drizzle-orm";
import { LRUCache } from "lru-cache";

import { db } from "@workspace/drizzle/index";
import { githubInstallation } from "@workspace/drizzle/schema";

import { appJwt, isGithubAppConfigured } from "./app-jwt";
import { mintInstallationToken } from "./installation-token";

// ─── Repo → installation resolution ──────────────────────────────
// GitHub is the source of truth for which installation covers a repo (repos
// are added/removed in GitHub settings, out of band). We resolve live with the
// app JWT and cache ~10 minutes; the DB row only vetoes suspended/removed
// installations the webhook has tombstoned.

type Resolution = { installationId: number } | null;

const repoCache = new LRUCache<string, { value: Resolution }>({
  max: 1000,
  ttl: 10 * 60 * 1000,
});

const cacheKey = (owner: string, repo: string) =>
  `${owner.toLowerCase()}/${repo.toLowerCase()}`;

/** Drop a cached repo→installation entry (installation webhooks call this). */
export const bustInstallationForRepo = (owner: string, repo: string) => {
  repoCache.delete(cacheKey(owner, repo));
};

/**
 * The installation covering owner/repo, or null when the app isn't installed
 * there (or is suspended/removed). Cached ~10 minutes.
 */
export async function installationForRepo(
  owner: string,
  repo: string
): Promise<Resolution> {
  if (!isGithubAppConfigured() || !owner || !repo) return null;

  const key = cacheKey(owner, repo);
  const cached = repoCache.get(key);
  if (cached) return cached.value;

  let value: Resolution = null;
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/installation`,
    {
      headers: {
        authorization: `Bearer ${appJwt()}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
      },
    }
  );
  if (res.ok) {
    const data = (await res.json()) as { id: number };
    // The webhook tombstones suspended/removed installations — treat those as
    // absent so callers fall back (and the hub shows the install prompt).
    const [row] = await db
      .select({
        suspendedAt: githubInstallation.suspendedAt,
        removedAt: githubInstallation.removedAt,
      })
      .from(githubInstallation)
      .where(eq(githubInstallation.installationId, data.id))
      .limit(1);
    if (!row?.suspendedAt && !row?.removedAt) {
      value = { installationId: data.id };
    }
  } else if (res.status !== 404) {
    // Don't cache transient failures as "not installed".
    throw new Error(
      `GitHub installation lookup failed (${res.status}) for ${owner}/${repo}.`
    );
  }

  repoCache.set(key, { value });
  return value;
}

/**
 * Installation token for owner/repo, or null when no active installation
 * covers it. The primary server-side GitHub credential once the app is
 * installed; callers fall back to OAuth tokens on null.
 */
export async function getInstallationTokenForRepo(
  owner: string,
  repo: string
): Promise<string | null> {
  const installation = await installationForRepo(owner, repo);
  if (!installation) return null;
  const { token } = await mintInstallationToken(installation.installationId);
  return token;
}
