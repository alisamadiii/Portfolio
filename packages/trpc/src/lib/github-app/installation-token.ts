import { LRUCache } from "lru-cache";

import { appJwt } from "./app-jwt";

// ─── Installation tokens ─────────────────────────────────────────
// Installation tokens live 1 hour on GitHub's side; we cache for 55 minutes so
// a token handed to a caller always has at least ~5 minutes of life left.

type MintedToken = { token: string; expiresAt: string };

const tokenCache = new LRUCache<number, MintedToken>({
  max: 500,
  ttl: 55 * 60 * 1000,
});

/** Drop a cached token (after a 401 — revoked or key rotated). */
export const bustInstallationToken = (installationId: number) => {
  tokenCache.delete(installationId);
};

/**
 * Mint (or reuse a cached) installation access token. No `permissions` body —
 * the token carries the app's full (deliberately small) permission set:
 * Contents RW + Pull requests RW + Metadata R. Requesting an explicit subset
 * would 422 the mint whenever the app's permissions evolve ahead of a deploy.
 */
export async function mintInstallationToken(
  installationId: number
): Promise<MintedToken> {
  const cached = tokenCache.get(installationId);
  if (cached) return cached;

  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${appJwt()}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
      },
    }
  );
  if (!res.ok) {
    throw new Error(
      `GitHub installation token mint failed (${res.status}) for installation ${installationId}.`
    );
  }
  const data = (await res.json()) as { token: string; expires_at: string };
  const minted = { token: data.token, expiresAt: data.expires_at };
  tokenCache.set(installationId, minted);
  return minted;
}
