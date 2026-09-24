import { createHmac } from "crypto";

/**
 * Short-lived, repo-scoped edit-session token for the canvas editor.
 *
 * The hub mints one at editor-open (authenticated, repo-access-checked) and puts
 * it in the iframe URL; the cms-bridge overlay sends it to the content-pilot
 * intake as a Bearer. content-pilot verifies it with the SAME EDIT_TOKEN_SECRET
 * and the SAME algorithm below. This keeps the long-lived content-pilot API key
 * on the server — it never reaches the browser bundle.
 *
 * Format (JWT-ish, no external dep): `base64url(payload).base64url(hmacSHA256)`.
 * content-pilot has an independent copy of this verify logic (separate repo).
 */

// 30 minutes — long enough for an edit session, short enough that a leaked
// token is near-worthless (and it is scoped to a single repo).
const DEFAULT_TTL_SECONDS = 30 * 60;

export interface EditTokenPayload {
  repoId: number;
  owner: string;
  repo: string;
  /** Expiry, unix seconds. */
  exp: number;
}

const b64url = (buf: Buffer) => buf.toString("base64url");

export function signEditToken(
  data: Omit<EditTokenPayload, "exp">,
  secret: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): string {
  const payload: EditTokenPayload = {
    ...data,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(createHmac("sha256", secret).update(body).digest());
  return `${body}.${sig}`;
}
