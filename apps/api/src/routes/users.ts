import { and, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { createDb, type Db } from "../db/index.js";
import {
  apiClientSettings,
  apiKeys,
  toApiUser,
  users as usersTable,
} from "../db/schema.js";
import { ApiError } from "../lib/errors.js";
import {
  decryptSecret,
  encryptSecret,
  generateApiKey,
  keyTypeFromPrefix,
} from "../lib/keys.js";
import { originSchema } from "../lib/origins.js";
import { parseBody } from "../lib/validate.js";
import {
  verifyBucketExists,
  verifyEmailDomain,
  verifyPublicBaseUrl,
} from "../lib/verify.js";
import type { AppEnv } from "../middleware/auth.js";

// Admin CRUD for API users. Mounted under /v1/admin (requireAdmin applied
// there). Since the merge into the portfolio DB, "API user" means a Better
// Auth `user` row plus an `api_client_settings` row — creating one here
// attaches API access to an existing portfolio account when the email already
// exists, and deleting one removes API access without touching the account.

// bucketName and publicBaseUrl only make sense as a pair — presign builds the
// public URL from both.
const bucketTogether = (d: {
  bucketName?: string | null;
  publicBaseUrl?: string | null;
}) => (d.bucketName == null) === (d.publicBaseUrl == null);
const bucketTogetherMsg = {
  message: "bucketName and publicBaseUrl must be set together",
};

const createSchema = z
  .object({
    email: z.string().email(),
    name: z.string().min(1).max(120).optional(),
    type: z.enum(["user", "admin"]).default("user"),
    bucketName: z.string().min(1).nullish(),
    publicBaseUrl: z.string().url().nullish(),
    emailDomain: z.string().min(1).nullish(),
    // Origins the user's keys may be called from (admins skip the check).
    allowedOrigins: z.array(originSchema).max(20).optional(),
    // Type of the key auto-minted below. Not a column — destructured out
    // before the inserts.
    keyType: z.enum(["public", "server"]).default("public"),
  })
  .refine(bucketTogether, bucketTogetherMsg);

const updateSchema = z
  .object({
    email: z.string().email().optional(),
    name: z.string().min(1).max(120).nullish(),
    type: z.enum(["user", "admin"]).optional(),
    bucketName: z.string().min(1).nullish(),
    publicBaseUrl: z.string().url().nullish(),
    emailDomain: z.string().min(1).nullish(),
    // Full-array replacement, like every other patched field; [] clears.
    allowedOrigins: z.array(originSchema).max(20).optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: "Provide at least one field to update",
  })
  .refine(bucketTogether, bucketTogetherMsg);

// Drizzle wraps the Postgres error — walk the cause chain for the
// unique-violation code (23505).
function isDuplicateEmail(err: unknown): boolean {
  for (
    let e = err as { code?: string; cause?: unknown } | undefined;
    e;
    e = e.cause as typeof e
  ) {
    if (e.code === "23505") return true;
  }
  return false;
}

// user + settings in one row, flattened to the ApiUser view.
async function loadApiUser(db: Db, where: ReturnType<typeof eq>) {
  const [row] = await db
    .select({ user: usersTable, settings: apiClientSettings })
    .from(usersTable)
    .leftJoin(apiClientSettings, eq(apiClientSettings.userId, usersTable.id))
    .where(where)
    .limit(1);
  return row ? { ...row, view: toApiUser(row.user, row.settings) } : undefined;
}

function userNotFound(): ApiError {
  return new ApiError(
    404,
    "USER_NOT_FOUND",
    "User not found",
    "No user exists with that id."
  );
}

export const users = new Hono<AppEnv>();

// API users only — a portfolio account without api_client_settings has no
// business showing up in the API admin list.
users.get("/", async (c) => {
  const db = createDb(c.env);
  const rows = await db
    .select({ user: usersTable, settings: apiClientSettings })
    .from(apiClientSettings)
    .innerJoin(usersTable, eq(apiClientSettings.userId, usersTable.id))
    .orderBy(desc(apiClientSettings.createdAt));
  return c.json(rows.map((r) => toApiUser(r.user, r.settings)));
});

// Everything an admin needs to hand off access: the merged user view plus
// every active key decrypted. Registered before /:id so "lookup" isn't taken
// for an id.
users.get("/lookup", async (c) => {
  const email = c.req.query("email");
  if (!email) {
    throw new ApiError(
      400,
      "MISSING_EMAIL_PARAM",
      "email query parameter is required",
      "Call this endpoint as /v1/admin/users/lookup?email=someone@example.com"
    );
  }
  const db = createDb(c.env);
  const row = await loadApiUser(db, eq(usersTable.email, email));
  if (!row) {
    throw new ApiError(
      404,
      "USER_NOT_FOUND",
      `No user with email "${email}"`,
      "The email must match exactly (case-sensitive). List all users via GET /v1/admin/users."
    );
  }

  const keyRows = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, row.user.id), isNull(apiKeys.revokedAt)))
    .orderBy(desc(apiKeys.createdAt));
  const keys = await Promise.all(
    keyRows.map(async (k) => ({
      id: k.id,
      prefix: k.prefix,
      type: keyTypeFromPrefix(k.prefix),
      key: await decryptSecret(k.secretEnc, c.env.KEY_ENC_SECRET),
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    }))
  );

  return c.json({ ...row.view, keys });
});

users.get("/:id", async (c) => {
  const db = createDb(c.env);
  const row = await loadApiUser(db, eq(usersTable.id, c.req.param("id")));
  if (!row) throw userNotFound();
  return c.json(row.view);
});

users.post("/", async (c) => {
  const { keyType, type, ...data } = await parseBody(c, createSchema);
  // Reject configs that can never work: the bucket must exist in R2 and the
  // domain must be verified in SES before the user is created.
  await Promise.all([
    data.bucketName &&
      data.publicBaseUrl &&
      verifyBucketExists(c.env, data.bucketName).then(() =>
        verifyPublicBaseUrl(c.env, data.bucketName!, data.publicBaseUrl!)
      ),
    data.emailDomain && verifyEmailDomain(c.env, data.emailDomain),
  ]);
  const db = createDb(c.env);

  // Existing portfolio account? Attach API access to it instead of failing —
  // unless it already has api_client_settings, which makes this a duplicate.
  const existing = await loadApiUser(db, eq(usersTable.email, data.email));
  if (existing?.settings) {
    throw new ApiError(
      409,
      "DUPLICATE_EMAIL",
      `A user with email "${data.email}" already exists`
    );
  }

  try {
    let userRow;
    if (existing) {
      const updates = {
        ...(type === "admin" ? { role: "admin" } : {}),
        ...(data.name ? { name: data.name } : {}),
      };
      if (Object.keys(updates).length > 0) {
        [userRow] = await db
          .update(usersTable)
          .set(updates)
          .where(eq(usersTable.id, existing.user.id))
          .returning();
      } else {
        userRow = existing.user;
      }
    } else {
      [userRow] = await db
        .insert(usersTable)
        .values({
          id: crypto.randomUUID(),
          email: data.email,
          name: data.name ?? data.email,
          role: type,
        })
        .returning();
    }

    const [settingsRow] = await db
      .insert(apiClientSettings)
      .values({
        userId: userRow.id,
        bucketName: data.bucketName,
        publicBaseUrl: data.publicBaseUrl,
        emailDomain: data.emailDomain,
        allowedOrigins: data.allowedOrigins,
      })
      .returning();

    // Every new user gets a key right away — full value returned once here
    // (recoverable later via lookup or keys/:id/reveal).
    const { key, prefix, keyHash } = await generateApiKey(keyType);
    const secretEnc = await encryptSecret(key, c.env.KEY_ENC_SECRET);
    const [keyRow] = await db
      .insert(apiKeys)
      .values({ userId: userRow.id, keyHash, prefix, secretEnc })
      .returning({ id: apiKeys.id });
    return c.json(
      {
        ...toApiUser(userRow, settingsRow),
        apiKey: { id: keyRow.id, prefix, key, type: keyType },
      },
      201
    );
  } catch (err) {
    if (isDuplicateEmail(err)) {
      throw new ApiError(
        409,
        "DUPLICATE_EMAIL",
        `A user with email "${data.email}" already exists`
      );
    }
    throw err;
  }
});

users.patch("/:id", async (c) => {
  const data = await parseBody(c, updateSchema);
  // Same pre-flight as create — updates must not point at a missing bucket
  // or an unverified domain either.
  await Promise.all([
    data.bucketName &&
      data.publicBaseUrl &&
      verifyBucketExists(c.env, data.bucketName).then(() =>
        verifyPublicBaseUrl(c.env, data.bucketName!, data.publicBaseUrl!)
      ),
    data.emailDomain && verifyEmailDomain(c.env, data.emailDomain),
  ]);
  const db = createDb(c.env);
  const id = c.req.param("id");
  const { email, name, type, ...settings } = data;

  try {
    let userRow;
    if (email !== undefined || name !== undefined || type !== undefined) {
      [userRow] = await db
        .update(usersTable)
        .set({
          ...(email !== undefined ? { email } : {}),
          // Better Auth name is NOT NULL — clearing it falls back to email.
          ...(name !== undefined ? { name: name ?? email ?? undefined } : {}),
          ...(type !== undefined ? { role: type } : {}),
        })
        .where(eq(usersTable.id, id))
        .returning();
    } else {
      [userRow] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, id))
        .limit(1);
    }
    if (!userRow) throw userNotFound();

    const hasSettingsPatch = Object.values(settings).some(
      (v) => v !== undefined
    );
    let settingsRow;
    if (hasSettingsPatch) {
      [settingsRow] = await db
        .insert(apiClientSettings)
        .values({ userId: id, ...settings })
        .onConflictDoUpdate({
          target: apiClientSettings.userId,
          set: settings,
        })
        .returning();
    } else {
      [settingsRow] = await db
        .select()
        .from(apiClientSettings)
        .where(eq(apiClientSettings.userId, id))
        .limit(1);
    }

    return c.json(toApiUser(userRow, settingsRow ?? null));
  } catch (err) {
    if (isDuplicateEmail(err)) {
      throw new ApiError(
        409,
        "DUPLICATE_EMAIL",
        `A user with email "${data.email}" already exists`
      );
    }
    throw err;
  }
});

// Removes API access only: settings and keys go, the portfolio account (and
// its audit trail in email_logs/env_files) stays.
users.delete("/:id", async (c) => {
  const db = createDb(c.env);
  const id = c.req.param("id");
  const [row] = await db
    .delete(apiClientSettings)
    .where(eq(apiClientSettings.userId, id))
    .returning({ userId: apiClientSettings.userId });
  if (!row) throw userNotFound();
  await db.delete(apiKeys).where(eq(apiKeys.userId, id));
  return c.body(null, 204);
});
