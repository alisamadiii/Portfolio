import { OrderBillingReason } from "@polar-sh/sdk/models/components/orderbillingreason.js";
import { OrderStatus } from "@polar-sh/sdk/models/components/orderstatus.js";
import { SubscriptionRecurringInterval } from "@polar-sh/sdk/models/components/subscriptionrecurringinterval.js";
import { SubscriptionStatus } from "@polar-sh/sdk/models/components/subscriptionstatus.js";
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role"),
  banned: boolean("banned"),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  phone: text("phone"),
  company: text("company"),
  address: text("address"),
  isClient: boolean("is_client").notNull().default(false),
  githubUsername: text("github_username"),
});

export const userSignals = pgTable("user_signals", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  needsRefresh: boolean("needs_refresh").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
  activeOrganizationId: text("active_organization_id"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
});

export const products = pgTable("product", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  trialInterval: text("trial_interval", {
    enum: ["day", "week", "month", "year"],
  }),
  trialIntervalCount: integer("trial_interval_count").default(0),
  popular: boolean("popular").notNull().default(false),
  priceAmount: integer("price_amount").notNull(),
  priceCurrency: text("price_currency").notNull().default("usd"),
  recurringInterval: text("recurring_interval", {
    enum: ["day", "week", "month", "year"],
  }),
  isRecurring: boolean("is_recurring").notNull().default(true),
  isArchived: boolean("is_archived").notNull().default(false),
  metadata: jsonb("metadata").$type<unknown>().notNull().default({}),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const subscriptions = pgTable("subscription", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  email: text("email").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("usd"),
  productId: text("product_id").notNull(),
  status: text("status", {
    enum: Object.values(SubscriptionStatus) as [SubscriptionStatus],
  }).notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),
  startedAt: timestamp("started_at"),
  canceledAt: timestamp("canceled_at"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  recurringInterval: text("recurring_interval", {
    enum: Object.values(SubscriptionRecurringInterval) as [
      SubscriptionRecurringInterval,
    ],
  }),
  customerCancellationReason: text("customer_cancellation_reason"),
  customerCancellationComment: text("customer_cancellation_comment"),
  metadata: jsonb("metadata").$type<unknown>().notNull().default({}),
});

export const orders = pgTable("order", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  email: text("email").notNull(),
  productId: text("product_id").notNull(),
  billingName: text("billing_name").notNull(),
  subscriptionId: text("subscription_id").notNull(),
  billingReason: text("billing_reason", {
    enum: Object.values(OrderBillingReason) as [OrderBillingReason],
  }).notNull(),
  totalAmount: integer("total_amount").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  status: text("status", {
    enum: Object.values(OrderStatus) as [OrderStatus],
  }).notNull(),
  discountAmount: integer("discount_amount").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  metadata: jsonb("metadata").$type<unknown>().notNull().default({}),
});

export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull(),
  type: text("type").notNull(), // e.g. subscription.updated
  createdAt: timestamp("created_at").defaultNow(),
  payload: jsonb("payload").$type<unknown>().notNull(),
});

export const source = pgTable("source", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  title: text("title").notNull(),
  description: text("description"),
  isPrivate: boolean("is_private").notNull().default(true),
  imageUrl: text("image_url"),
  darkImageUrl: text("dark_image_url"),
  videoUrl: text("video_url"),
  darkVideoUrl: text("dark_video_url"),
  from: text("from"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sourceFile = pgTable("source_file", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  index: integer("index").notNull().default(0),

  sourceId: uuid("source_id")
    .notNull()
    .references(() => source.id, { onDelete: "cascade" }),

  filename: text("filename").notNull(),
  path: text("path"), // optional: "src/components/Button.tsx"
  content: text("content").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const previousCustomers = pgTable("previous_customers", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  email: text("email").notNull(),
  code: text("code").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CMS (cms.alisamadii.com) — GitHub-backed content management

export const cmsCollaborator = pgTable(
  "cms_collaborator",
  {
    id: serial("id").primaryKey(),
    type: text("type").notNull(),
    ownerId: integer("owner_id").notNull(),
    repoId: integer("repo_id"),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    branch: text("branch"),
    email: text("email").notNull(),
    userId: text("user_id").references(() => user.id),
    invitedBy: text("invited_by").references(() => user.id),
  },
  (table) => ({
    idxCmsCollaboratorOwnerRepoEmail: index(
      "idx_cms_collaborator_owner_repo_email"
    ).on(table.owner, table.repo, table.email),
    idxCmsCollaboratorUserId: index("idx_cms_collaborator_user_id").on(
      table.userId
    ),
    uqCmsCollaboratorOwnerRepoEmailCi: uniqueIndex(
      "uq_cms_collaborator_owner_repo_email_ci"
    ).on(
      sql`lower(${table.owner})`,
      sql`lower(${table.repo})`,
      sql`lower(${table.email})`
    ),
  })
);

export const cmsCollaboratorInvite = pgTable(
  "cms_collaborator_invite",
  {
    id: serial("id").primaryKey(),
    token: text("token").notNull(),
    email: text("email").notNull(),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uqCmsCollaboratorInviteToken: uniqueIndex(
      "uq_cms_collaborator_invite_token"
    ).on(table.token),
    idxCmsCollaboratorInviteOwnerRepoEmail: index(
      "idx_cms_collaborator_invite_owner_repo_email"
    ).on(table.owner, table.repo, table.email),
    uqCmsCollaboratorInviteOwnerRepoEmailCi: uniqueIndex(
      "uq_cms_collaborator_invite_owner_repo_email_ci"
    ).on(
      sql`lower(${table.owner})`,
      sql`lower(${table.repo})`,
      sql`lower(${table.email})`
    ),
  })
);

export const cmsConfig = pgTable(
  "cms_config",
  {
    id: serial("id").primaryKey(),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    branch: text("branch").notNull(),
    sha: text("sha").notNull(),
    version: text("version").notNull(),
    object: text("object").notNull(),
    lastCheckedAt: timestamp("last_checked_at").notNull().defaultNow(),
  },
  (table) => ({
    idxCmsConfigOwnerRepoBranch: uniqueIndex(
      "idx_cms_config_owner_repo_branch"
    ).on(table.owner, table.repo, table.branch),
  })
);

// Where CMS media is stored/browsed for a repo. Add new providers here.
export const mediaProviderValues = ["github", "imagekit"] as const;
export const mediaProviderEnum = pgEnum("media_provider", mediaProviderValues);

export type MediaProviderId = (typeof mediaProviderValues)[number];

export const cmsRepoSettings = pgTable(
  "cms_repo_settings",
  {
    id: serial("id").primaryKey(),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    basePath: text("base_path").notNull().default(""),
    mediaProvider: mediaProviderEnum("media_provider")
      .notNull()
      .default("github"),
    // Provider-specific config (e.g. ImageKit urlEndpoint/publicKey/privateKey/folder)
    mediaConfig: jsonb("media_config").$type<Record<string, string>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uqCmsRepoSettingsOwnerRepoCi: uniqueIndex(
      "uq_cms_repo_settings_owner_repo_ci"
    ).on(sql`lower(${table.owner})`, sql`lower(${table.repo})`),
  })
);

export const cmsOrgRepo = pgTable(
  "cms_org_repo",
  {
    id: serial("id").primaryKey(),
    repoId: integer("repo_id").notNull(),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    private: boolean("private").notNull().default(false),
    defaultBranch: text("default_branch").notNull(),
    githubUpdatedAt: timestamp("github_updated_at").notNull(),
    syncedAt: timestamp("synced_at").notNull().defaultNow(),
  },
  (table) => ({
    uqCmsOrgRepoRepoId: uniqueIndex("uq_cms_org_repo_repo_id").on(table.repoId),
    uqCmsOrgRepoOwnerRepoCi: uniqueIndex("uq_cms_org_repo_owner_repo_ci").on(
      sql`lower(${table.owner})`,
      sql`lower(${table.repo})`
    ),
  })
);

export const cmsCacheFile = pgTable(
  "cms_cache_file",
  {
    id: serial("id").primaryKey(),
    context: text("context").notNull().default("collection"),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    branch: text("branch").notNull(),
    parentPath: text("parent_path").notNull(),
    name: text("name").notNull(),
    path: text("path").notNull(),
    type: text("type").notNull(),
    content: text("content"),
    sha: text("sha"),
    size: integer("size"),
    downloadUrl: text("download_url"),
    commitSha: text("commit_sha"),
    commitTimestamp: timestamp("commit_timestamp"),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    idxCmsCacheFileOwnerRepoBranchParentPath: index(
      "idx_cms_cache_file_owner_repo_branch_parent_path"
    ).on(table.owner, table.repo, table.branch, table.parentPath),
    idxCmsCacheFileOwnerRepoBranchPath: uniqueIndex(
      "idx_cms_cache_file_owner_repo_branch_path"
    ).on(table.owner, table.repo, table.branch, table.path),
  })
);

export const cmsCacheFileMeta = pgTable(
  "cms_cache_file_meta",
  {
    id: serial("id").primaryKey(),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    branch: text("branch").notNull(),
    path: text("path").notNull().default(""),
    context: text("context").notNull().default("branch"),
    commitSha: text("commit_sha"),
    commitTimestamp: timestamp("commit_timestamp"),
    status: text("status").notNull().default("ok"),
    error: text("error"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    lastCheckedAt: timestamp("last_checked_at").notNull().defaultNow(),
  },
  (table) => ({
    idxCmsCacheFileMetaOwnerRepoBranchPathContext: uniqueIndex(
      "idx_cms_cache_file_meta_owner_repo_branch_path_context"
    ).on(table.owner, table.repo, table.branch, table.path, table.context),
  })
);

// Agency API (apps/api Worker) — merged in from the old agency-api Neon DB.
// API consumers are clients: the identity row is Better Auth `user`
// (isClient=true), and everything API-specific hangs off it here.

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
    kind: text("kind", { enum: ["send", "contact"] }).notNull(),
    fromAddress: text("from_address").notNull(),
    to: text("to").array().notNull(),
    subject: text("subject").notNull(),
    messageId: text("message_id").notNull(), // SES MessageId
    r2Key: text("r2_key").notNull(), // path inside the "emails" bucket
    // Contact-form sends only: who submitted the form, and from which site.
    visitorEmail: text("visitor_email"),
    source: text("source"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("email_logs_user_created_idx").on(t.userId, t.createdAt)]
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

// Don't change the order of the values
export const projectsTypeValues = [
  "PORTFOLIO",
  "DOCS",
  "MOTION",
  "AGENCY",
  "TEMPLATE",
  "ADMIN",
  "SAASKIT",
  "CMS",
] as const;
export const projectsTypeEnum = pgEnum("projects_type", projectsTypeValues);

export type ProjectType = (typeof projectsTypeValues)[number];
