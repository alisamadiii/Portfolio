import { and, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { createDb } from "../db/index.js";
import { apiKeys, users as usersTable } from "../db/schema.js";
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

// Admin CRUD for users. Mounted under /v1/admin (requireAdmin applied there).

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
    // Type of the key auto-minted below. Not a users column — destructured
    // out before the insert.
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

export const users = new Hono<AppEnv>();

users.get("/", async (c) => {
  const db = createDb(c.env);
  const rows = await db
    .select()
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));
  return c.json(rows);
});

// Everything an admin needs to hand off access: the full user row plus every
// active key decrypted. Registered before /:id so "lookup" isn't taken for an id.
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
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (!user) {
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
    .where(and(eq(apiKeys.userId, user.id), isNull(apiKeys.revokedAt)))
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

  return c.json({ ...user, keys });
});

users.get("/:id", async (c) => {
  const db = createDb(c.env);
  const [row] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, c.req.param("id")))
    .limit(1);
  if (!row)
    throw new ApiError(
      404,
      "USER_NOT_FOUND",
      "User not found",
      "No user exists with that id."
    );
  return c.json(row);
});

users.post("/", async (c) => {
  const { keyType, ...data } = await parseBody(c, createSchema);
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
  try {
    const [row] = await db.insert(usersTable).values(data).returning();
    // Every new user gets a key right away — full value returned once here
    // (recoverable later via lookup or keys/:id/reveal).
    const { key, prefix, keyHash } = await generateApiKey(keyType);
    const secretEnc = await encryptSecret(key, c.env.KEY_ENC_SECRET);
    const [keyRow] = await db
      .insert(apiKeys)
      .values({ userId: row.id, keyHash, prefix, secretEnc })
      .returning({ id: apiKeys.id });
    return c.json(
      { ...row, apiKey: { id: keyRow.id, prefix, key, type: keyType } },
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
  try {
    const [row] = await db
      .update(usersTable)
      .set(data)
      .where(eq(usersTable.id, c.req.param("id")))
      .returning();
    if (!row)
      throw new ApiError(
        404,
        "USER_NOT_FOUND",
        "User not found",
        "No user exists with that id."
      );
    return c.json(row);
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

// Hard delete — the user's keys go with them (FK cascade).
users.delete("/:id", async (c) => {
  const db = createDb(c.env);
  const [row] = await db
    .delete(usersTable)
    .where(eq(usersTable.id, c.req.param("id")))
    .returning({ id: usersTable.id });
  if (!row)
    throw new ApiError(
      404,
      "USER_NOT_FOUND",
      "User not found",
      "No user exists with that id."
    );
  return c.body(null, 204);
});
