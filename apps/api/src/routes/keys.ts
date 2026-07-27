import { desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { createDb } from "../db/index.js";
import { apiKeys, users } from "../db/schema.js";
import { ApiError } from "../lib/errors.js";
import {
  decryptSecret,
  encryptSecret,
  generateApiKey,
  keyTypeFromPrefix,
  LEGACY_PUBLIC_PREFIX,
} from "../lib/keys.js";
import { parseBody } from "../lib/validate.js";
import type { AppEnv } from "../middleware/auth.js";

// Admin CRUD for API keys. Mounted under /v1/admin (requireAdmin applied
// there). A key is just a pointer to a user — nothing else to configure.

// Public-facing columns — never expose keyHash or secretEnc.
const publicCols = {
  id: apiKeys.id,
  userId: apiKeys.userId,
  prefix: apiKeys.prefix,
  lastUsedAt: apiKeys.lastUsedAt,
  createdAt: apiKeys.createdAt,
  revokedAt: apiKeys.revokedAt,
};

// The key's owner can be given by id or by email — either works. The email is
// an exact-match lookup, not validated as an address (rows like "admin@local"
// are legitimate). `type` defaults to public: omitting it must never hand out
// a key that skips the origin check.
const createSchema = z
  .object({
    // Better Auth user ids are opaque text, not UUIDs.
    userId: z.string().min(1).optional(),
    email: z.string().min(1).optional(),
    type: z.enum(["public", "server"]).default("public"),
  })
  .refine((d) => d.userId || d.email, {
    message: "Provide userId or email",
  });

// A key's type lives in its prefix, not in a column — derive it on the way out
// so callers never have to parse the prefix themselves.
function withType<T extends { prefix: string }>(row: T) {
  return { ...row, type: keyTypeFromPrefix(row.prefix) };
}

export const keys = new Hono<AppEnv>();

keys.get("/", async (c) => {
  const db = createDb(c.env);
  const rows = await db
    .select({
      ...publicCols,
      userEmail: users.email,
      userName: users.name,
    })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .orderBy(desc(apiKeys.createdAt));
  return c.json(rows.map(withType));
});

keys.post("/", async (c) => {
  const { userId, email, type } = await parseBody(c, createSchema);
  const db = createDb(c.env);

  const [user] = await db
    .select()
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

  const { key, prefix, keyHash } = await generateApiKey(type);
  const secretEnc = await encryptSecret(key, c.env.KEY_ENC_SECRET);
  const [row] = await db
    .insert(apiKeys)
    .values({ userId: user.id, keyHash, prefix, secretEnc })
    .returning(publicCols);

  // Full key returned at creation; also recoverable later via /:id/reveal.
  return c.json({ ...withType(row), key }, 201);
});

// Decrypt and return a key's full value so it can be copied/handed off.
// Revoked keys are never revealed — they can't authenticate anyway.
keys.get("/:id/reveal", async (c) => {
  const db = createDb(c.env);
  const [row] = await db
    .select({ secretEnc: apiKeys.secretEnc, revokedAt: apiKeys.revokedAt })
    .from(apiKeys)
    .where(eq(apiKeys.id, c.req.param("id")))
    .limit(1);
  if (!row)
    throw new ApiError(
      404,
      "API_KEY_NOT_FOUND",
      "API key not found",
      "No key exists with that id."
    );
  if (row.revokedAt) {
    throw new ApiError(
      410,
      "API_KEY_REVOKED",
      "This key was revoked.",
      "Revoked keys cannot authenticate and are not revealed. Create a new key for the user instead."
    );
  }
  const key = await decryptSecret(row.secretEnc, c.env.KEY_ENC_SECRET);
  return c.json({ key });
});

// Phase 1 of retiring the legacy ak_live_ prefix: mint a fresh ak_pub_ key for
// every user still on one. Purely additive — the legacy keys are deliberately
// left active, because their value is embedded in client websites that haven't
// been updated yet. Revoking them is a separate, manual step (DELETE /:id) to
// be done per site once it's confirmed live on its new key.
//
// Idempotent: a user who already holds an active ak_pub_ key is skipped, so
// re-running doesn't pile up duplicates. `?dryRun=1` reports what would happen
// without writing anything.
keys.post("/migrate-legacy", async (c) => {
  const db = createDb(c.env);
  const dryRun = ["1", "true"].includes(c.req.query("dryRun") ?? "");

  const active = await db
    .select({
      id: apiKeys.id,
      userId: apiKeys.userId,
      prefix: apiKeys.prefix,
      email: users.email,
    })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(isNull(apiKeys.revokedAt))
    .orderBy(desc(apiKeys.createdAt));

  // Users already carrying a live ak_pub_ key need nothing.
  const migrated = new Set(
    active.filter((k) => k.prefix.startsWith("ak_pub_")).map((k) => k.userId)
  );

  const migratedNow: unknown[] = [];
  const skipped: unknown[] = [];

  for (const legacy of active.filter((k) =>
    k.prefix.startsWith(LEGACY_PUBLIC_PREFIX)
  )) {
    const entry = {
      userId: legacy.userId,
      email: legacy.email,
      legacyKeyId: legacy.id,
      legacyPrefix: legacy.prefix,
    };
    if (migrated.has(legacy.userId)) {
      skipped.push({ ...entry, reason: "already has an active ak_pub_ key" });
      continue;
    }
    // Claim the user up front so a second legacy key for the same user in this
    // same run doesn't mint a second new key.
    migrated.add(legacy.userId);

    if (dryRun) {
      migratedNow.push({ ...entry, newKeyId: null, newKey: null });
      continue;
    }

    const { key, prefix, keyHash } = await generateApiKey("public");
    const secretEnc = await encryptSecret(key, c.env.KEY_ENC_SECRET);
    const [newRow] = await db
      .insert(apiKeys)
      .values({ userId: legacy.userId, keyHash, prefix, secretEnc })
      .returning({ id: apiKeys.id });
    migratedNow.push({ ...entry, newKeyId: newRow.id, newKey: key });
  }

  return c.json({
    dryRun,
    migrated: migratedNow,
    skipped,
    // Spelled out because the legacy keys still authenticate after this call.
    next: "Update each client site to its new key, then revoke the legacy key via DELETE /v1/admin/keys/:legacyKeyId.",
  });
});

// Soft-revoke by default; `?permanent=1` hard-deletes the row entirely.
keys.delete("/:id", async (c) => {
  const db = createDb(c.env);
  const id = c.req.param("id");
  const permanent = ["1", "true"].includes(c.req.query("permanent") ?? "");

  const [row] = permanent
    ? await db.delete(apiKeys).where(eq(apiKeys.id, id)).returning(publicCols)
    : await db
        .update(apiKeys)
        .set({ revokedAt: new Date() })
        .where(eq(apiKeys.id, id))
        .returning(publicCols);

  if (!row)
    throw new ApiError(
      404,
      "API_KEY_NOT_FOUND",
      "API key not found",
      "No key exists with that id."
    );
  return c.body(null, 204);
});
