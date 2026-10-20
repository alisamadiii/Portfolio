import { createSign } from "crypto";

// ─── GitHub App JWT ──────────────────────────────────────────────
// Hand-rolled RS256 app JWT (no @octokit/auth-app — the protocol is one signed
// token + two REST endpoints). The private key env is the base64 of GitHub's
// PKCS#1 PEM so it fits a single-line env var.

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString("base64url");

export const isGithubAppConfigured = () =>
  !!(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY);

/**
 * A short-lived (9 min) RS256 JWT authenticating as the GitHub App itself.
 * iat is backdated 60s to absorb clock skew (GitHub rejects future iat).
 */
export function appJwt(): string {
  const appId = process.env.GITHUB_APP_ID;
  const keyB64 = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!appId || !keyB64) {
    throw new Error("GitHub App is not configured (GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY).");
  }
  const privateKey = Buffer.from(keyB64, "base64").toString("utf8");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(privateKey).toString("base64url");
  return `${header}.${payload}.${signature}`;
}
