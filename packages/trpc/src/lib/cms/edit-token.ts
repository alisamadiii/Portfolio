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
  // GitHub repository id — the only identity claim; content-pilot resolves the
  // owner/repo slug from it server-side, so a rename never invalidates tokens.
  projectId: string;
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

// 15 minutes — the upload starts right after minting; the 409-on-existing-dir
// in content-pilot makes the token effectively single-use anyway.
const IMPORT_TTL_SECONDS = 15 * 60;

/**
 * One-time project-import token (browser → content-pilot zip upload). Same
 * secret and format as the edit token, but the `scope: 'import'` claim keeps
 * the two strictly separate: content-pilot's verifyEditToken rejects any
 * payload carrying a `scope`, and its verifyImportToken requires this one.
 */
export function signImportToken(
  data: { projectId: string },
  secret: string,
  ttlSeconds: number = IMPORT_TTL_SECONDS
): string {
  const payload = {
    projectId: data.projectId,
    scope: "import" as const,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(createHmac("sha256", secret).update(body).digest());
  return `${body}.${sig}`;
}
