import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

// Agency API (apps/api Worker) — merged in from the old agency-api Neon DB.
// API consumers are portfolio users: the identity row is Better Auth `user`,
// and everything API-specific hangs off it here.

// Per-user API capabilities. bucketName/publicBaseUrl grant uploads to exactly
// that bucket; emailDomain grants sending as @domain. Null means the
// capability is off — API routes return a readable 403. A row in this table is
// what makes a portfolio user an "API user".
export const apiClientSettings = pgTable("api_client_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  bucketName: text("bucket_name"),
  publicBaseUrl: text("public_base_url"),
  // Domain the user may send email as (e.g. "acme.com").
  emailDomain: text("email_domain"),
  // Origin rules the user's keys may be called from: a bare domain
  // ("acme.com" — any scheme/port/subdomain) or an exact origin
  // ("https://acme.com", "http://localhost:5173"). Empty means the user's
  // keys are dead until an admin configures origins. Admin users skip the
  // check entirely (server-side callers send no Origin header).
  allowedOrigins: text("allowed_origins")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  // Optional link to the hub project this API user belongs to
  // (= hubProject.repoId, GitHub-stable). Stamped onto every email_logs row
  // the user's keys produce so emails can be shown per project.
  repoId: integer("repo_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ApiClientSettings = typeof apiClientSettings.$inferSelect;
export type NewApiClientSettings = typeof apiClientSettings.$inferInsert;

// API keys belong to a user and carry no permissions of their own — access is
// whatever the owning user is configured for. The sha-256 hash is used for
// auth; the full key is also stored AES-256-GCM-encrypted so it can be
// revealed/copied later.
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull().unique(),
  // Also encodes the key's type: ak_pub_ (origin-checked) vs ak_ser_ (not).
  // ak_live_ is the pre-split prefix and is treated as public.
  prefix: text("prefix").notNull(), // e.g. "ak_pub_a1b2c3"
  secretEnc: text("secret_enc").notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

// Client-visible audit trail of every email the API sent for a user. The
// rendered HTML is archived in the private "emails" R2 bucket under r2Key;
// clients read it via a presigned URL from GET /v1/emails/:id/html.
export const emailLogs = pgTable(
  "email_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Free-form category: "send" (direct API send), "contact" (contact form),
    // or any custom value the client passes when sending.
    type: text("type").notNull(),
    fromAddress: text("from_address").notNull(),
    to: text("to").array().notNull(),
    subject: text("subject").notNull(),
    messageId: text("message_id").notNull(), // SES MessageId
    r2Key: text("r2_key").notNull(), // path inside the "emails" bucket
    // Contact-form sends only: who submitted the form, and from which site.
    visitorEmail: text("visitor_email"),
    source: text("source"),
    // Copied from api_client_settings.repo_id at send time; null for rows
    // sent before the sender was linked to a hub project.
    repoId: integer("repo_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("email_logs_user_created_idx").on(t.userId, t.createdAt),
    index("email_logs_repo_created_idx").on(t.repoId, t.createdAt),
  ]
);

export type EmailLog = typeof emailLogs.$inferSelect;
export type NewEmailLog = typeof emailLogs.$inferInsert;

// Off-machine backup of a client project's .env file. The content is stored
// AES-256-GCM-encrypted under KEY_ENC_SECRET (same scheme as
// api_keys.secret_enc) and is only decrypted on an authenticated reveal, so a
// database dump on its own leaks nothing. Many rows per user are expected —
// uploading a new one never overwrites an older snapshot.
export const envFiles = pgTable(
  "env_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // The only free text the caller writes, e.g. "acme-site production".
    description: text("description"),
    contentEnc: text("content_enc").notNull(),
    // Derived from the content on write so listings can show size without
    // decrypting anything. Never accepted from the request body.
    varCount: integer("var_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("env_files_user_created_idx").on(t.userId, t.createdAt)]
);

export type EnvFile = typeof envFiles.$inferSelect;
export type NewEnvFile = typeof envFiles.$inferInsert;
