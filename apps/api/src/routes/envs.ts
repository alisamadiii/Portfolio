import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { createDb } from "../db/index.js";
import { envFiles, users } from "../db/schema.js";
import { ApiError, ExpectedError } from "../lib/errors.js";
import { decryptSecret, encryptSecret, hashPassword } from "../lib/keys.js";
import { capture } from "../lib/posthog.js";
import {
  REVEAL_PASSWORD_HASH,
  REVEAL_PASSWORD_SALT,
} from "../lib/reveal-password.js";
import { parseBody } from "../lib/validate.js";
import type { AppEnv } from "../middleware/auth.js";

// Encrypted .env backups. Mounted under /v1/admin, so requireAdmin covers
// every route here — that guard is the whole access model and there is
// deliberately no client-facing counterpart under /v1/me: a client key lives in
// someone else's codebase, and one leaked key must never be able to read back a
// project's secrets. Admin keys are the only thing that can decrypt.
//
// A client hands over a raw .env string and nothing else — the encryption, the
// var count and the timestamps are all derived here.

// Public-facing columns — never expose contentEnc. The plaintext is only ever
// served by the explicit /:id/reveal route.
export const publicCols = {
  id: envFiles.id,
  userId: envFiles.userId,
  description: envFiles.description,
  varCount: envFiles.varCount,
  createdAt: envFiles.createdAt,
  updatedAt: envFiles.updatedAt,
};

// Count assignment lines so a listing shows how big a snapshot is without
// decrypting it. Blank lines and # comments don't count.
export function countVars(content: string): number {
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && /^[\w.-]+\s*=/.test(l)).length;
}

// ── Reveal password ─────────────────────────────────────────────────────────
// Second factor on the only route that returns plaintext. An admin key alone is
// not enough: keys get left configured in Postman workspaces and pasted into
// scripts, and one leaked key would otherwise mean every client's credentials.
// The hash itself lives in ../lib/reveal-password.js.

// Constant-time compare: a plain === leaks how many leading characters matched
// via response timing, which is enough to walk a hash out one byte at a time.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Failed attempts are counted per admin key and locked out well below what the
// 60 req/min key limiter would allow — that ceiling is fine for an API, far too
// generous for a password.
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_SECONDS = 15 * 60;

const revealSchema = z.object({ password: z.string().min(1) }).strict();

// The owner can be given by id or by email — either works, same as the keys
// route. `.strict()` because varCount and contentEnc are derived, never
// supplied: a body carrying them is a mistake worth surfacing, not ignoring.
const createSchema = z
  .object({
    // Better Auth user ids are opaque text, not UUIDs.
    userId: z.string().min(1).optional(),
    email: z.string().min(1).optional(),
    content: z.string().min(1),
    description: z.string().max(500).optional(),
  })
  .strict()
  .refine((d) => d.userId || d.email, {
    message: "Provide userId or email",
  });

const updateSchema = z
  .object({
    content: z.string().min(1).optional(),
    description: z.string().max(500).nullish(),
  })
  .strict()
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: "Provide at least one field to update",
  });

// A .env pasted straight into the body is the common case, and hand-escaping
// every newline into a JSON string is busywork that also invites mistakes. So
// a non-JSON Content-Type means "the body IS the file": the owner and the
// description come from the query string instead.
//
//   POST /v1/admin/envs?email=client@acme.com&description=acme%20production
//   Content-Type: text/plain
//   <the .env, pasted verbatim>
//
// A JSON body with a `content` field works too.
function isRawUpload(c: {
  req: { header: (n: string) => string | undefined };
}) {
  return !(c.req.header("Content-Type") ?? "").includes("application/json");
}

async function readRawBody(c: {
  req: { text: () => Promise<string> };
}): Promise<string> {
  const content = await c.req.text();
  if (!content.trim())
    throw new ApiError(
      400,
      "VALIDATION_FAILED",
      "content: request body is empty",
      "Paste the .env file as the request body, or send a JSON body with a `content` field."
    );
  return content;
}

// A reveal always serves the file as text/plain — the point of this endpoint
// is to hand back something you can paste straight into a .env, and a JSON
// string renders every newline as a literal \n. Errors still come back in the
// standard JSON envelope; only the 200 body is raw.
//
// no-store keeps the plaintext out of every cache between here and the caller.
function revealResponse(
  c: {
    text: (v: string, s?: undefined, h?: Record<string, string>) => Response;
  },
  content: string
): Response {
  return c.text(content, undefined, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store, private",
  });
}

function notFound(): ApiError {
  return new ApiError(
    404,
    "ENV_FILE_NOT_FOUND",
    "Env file not found",
    "No env file exists with that id. List them via GET /v1/admin/envs."
  );
}

export const envs = new Hono<AppEnv>();

// Optional ?userId= / ?email= narrows the list to one client.
envs.get("/", async (c) => {
  const db = createDb(c.env);
  const userId = c.req.query("userId");
  const email = c.req.query("email");

  const where = userId
    ? eq(envFiles.userId, userId)
    : email
      ? eq(users.email, email)
      : undefined;

  const rows = await db
    .select({ ...publicCols, userEmail: users.email, userName: users.name })
    .from(envFiles)
    .innerJoin(users, eq(envFiles.userId, users.id))
    .where(where)
    .orderBy(desc(envFiles.createdAt));
  return c.json(rows);
});

envs.get("/:id", async (c) => {
  const db = createDb(c.env);
  const [row] = await db
    .select({ ...publicCols, userEmail: users.email, userName: users.name })
    .from(envFiles)
    .innerJoin(users, eq(envFiles.userId, users.id))
    .where(eq(envFiles.id, c.req.param("id")))
    .limit(1);
  if (!row) throw notFound();
  return c.json(row);
});

// Decrypt and return the raw .env text, byte-for-byte as it was uploaded.
//
// POST, not GET, because it carries a password: query strings land in Worker
// logs, Postman history and PostHog's request.query, request bodies do not (and
// env-route bodies are excluded from telemetry buffering in app.ts). There is
// deliberately no GET counterpart — it would be a passwordless path to the same
// plaintext, which would make this gate decorative.
envs.post("/:id/reveal", async (c) => {
  const { password } = await parseBody(c, revealSchema);
  const keyId = c.get("apiKey").id;
  const attemptsKey = `env-reveal-fail:${keyId}`;
  // Localhost skips the lockout, same as keyLimiter — dev shouldn't lock itself
  // out, and the KV binding isn't always present there.
  const host = new URL(c.req.url).hostname;
  const throttled = host !== "localhost" && host !== "127.0.0.1";

  const attempts = throttled
    ? Number((await c.env.RATE_LIMIT_KV.get(attemptsKey)) ?? 0)
    : 0;
  if (attempts >= MAX_ATTEMPTS) {
    throw new ApiError(
      429,
      "TOO_MANY_PASSWORD_ATTEMPTS",
      "Too many incorrect passwords. Try again later.",
      `This key is locked out of env reveals for up to ${ATTEMPT_WINDOW_SECONDS / 60} minutes.`
    );
  }

  // Checked before the row is looked up: a wrong password must not be able to
  // probe which ids exist.
  const submitted = await hashPassword(password, REVEAL_PASSWORD_SALT);
  if (!timingSafeEqual(submitted, REVEAL_PASSWORD_HASH)) {
    if (throttled) {
      await c.env.RATE_LIMIT_KV.put(attemptsKey, String(attempts + 1), {
        expirationTtl: ATTEMPT_WINDOW_SECONDS,
      });
    }
    // Worth seeing in PostHog — someone with a valid admin key guessing at the
    // vault password is exactly the signal that matters. The submitted value is
    // never included.
    capture(c, "$exception", {
      $exception_list: [
        { type: "ApiError", value: "Incorrect env reveal password" },
      ],
      status: 403,
      error_code: "ENV_PASSWORD_INVALID",
      message: "Incorrect env reveal password",
      expected: true,
      env_file_id: c.req.param("id"),
      failed_attempts: attempts + 1,
    });
    throw new ExpectedError(
      403,
      "ENV_PASSWORD_INVALID",
      "Incorrect password.",
      "Env reveals require the vault password in addition to an admin key."
    );
  }

  const db = createDb(c.env);
  const [row] = await db
    .select({ contentEnc: envFiles.contentEnc })
    .from(envFiles)
    .where(eq(envFiles.id, c.req.param("id")))
    .limit(1);
  if (!row) throw notFound();

  if (throttled) await c.env.RATE_LIMIT_KV.delete(attemptsKey);
  const content = await decryptSecret(row.contentEnc, c.env.KEY_ENC_SECRET);
  return revealResponse(c, content);
});

envs.post("/", async (c) => {
  const { userId, email, content, description } = isRawUpload(c)
    ? {
        userId: c.req.query("userId"),
        email: c.req.query("email"),
        description: c.req.query("description"),
        content: await readRawBody(c),
      }
    : await parseBody(c, createSchema);

  if (!userId && !email)
    throw new ApiError(
      400,
      "VALIDATION_FAILED",
      "body: Provide userId or email",
      "On a raw text/plain upload these come from the query string: ?email=client@acme.com&description=acme%20production"
    );

  const db = createDb(c.env);

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(userId ? eq(users.id, userId) : eq(users.email, email!))
    .limit(1);
  if (!user)
    throw new ApiError(
      404,
      "USER_NOT_FOUND",
      userId ? `No user with id "${userId}"` : `No user with email "${email}"`,
      "List users via GET /v1/admin/users, or look one up via GET /v1/admin/users/lookup?email=..."
    );

  const contentEnc = await encryptSecret(content, c.env.KEY_ENC_SECRET);
  const [row] = await db
    .insert(envFiles)
    .values({
      userId: user.id,
      description,
      contentEnc,
      varCount: countVars(content),
    })
    .returning(publicCols);

  // The content is never echoed back — read it via /:id/reveal.
  return c.json(row, 201);
});

envs.patch("/:id", async (c) => {
  // Same raw-paste shortcut as create: the body is the new .env, and
  // ?description= is the only other thing you can change.
  const { content, description } = isRawUpload(c)
    ? { content: await readRawBody(c), description: c.req.query("description") }
    : await parseBody(c, updateSchema);
  const db = createDb(c.env);

  const [row] = await db
    .update(envFiles)
    .set({
      ...(description !== undefined ? { description } : {}),
      ...(content !== undefined
        ? {
            contentEnc: await encryptSecret(content, c.env.KEY_ENC_SECRET),
            varCount: countVars(content),
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(envFiles.id, c.req.param("id")))
    .returning(publicCols);
  if (!row) throw notFound();
  return c.json(row);
});

// Hard delete — a stale snapshot has no audit value worth soft-deleting for.
envs.delete("/:id", async (c) => {
  const db = createDb(c.env);
  const [row] = await db
    .delete(envFiles)
    .where(eq(envFiles.id, c.req.param("id")))
    .returning({ id: envFiles.id });
  if (!row) throw notFound();
  return c.body(null, 204);
});
