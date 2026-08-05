// Hand-written mirrors of the Worker's zod schemas and response shapes.
// Keep in sync with:
//   src/routes/emails.ts   (sendSchema, POST /v1/emails/send)
//   src/routes/uploads.ts  (presignSchema/deleteSchema, /v1/uploads*)
//   src/routes/me.ts + src/db/schema.ts (GET /v1/me, users table)

// ---- emails ----

export interface SendEmailRequest {
  /** Sender address. Must be on your configured email domain (non-admin keys). */
  from: string;
  /** One recipient or a list of recipients. */
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /**
   * Free-form category stored on the log row, e.g. "newsletter", "receipt".
   * @default "send"
   */
  type?: string;
}

export interface SendEmailResponse {
  /** Provider message id. */
  id: string;
}

export interface SendContactRequest {
  /** Visitor's name (shown in the email and its subject). */
  name: string;
  /** Visitor's email. Becomes the Reply-To of the notification. */
  email: string;
  /** Visitor's message. */
  message: string;
  /** @default "New contact from {name}" */
  subject?: string;
  /** Where the form lives, e.g. "Ali Samadi — Contact Form". Defaults to the request Origin. */
  source?: string;
  /**
   * Extra form fields (phone, company, budget, …) rendered as a Details
   * section in the email, exactly as sent. Max 25 keys; string values up to
   * 2000 chars.
   */
  metadata?: Record<string, string | number | boolean>;
}

// ---- uploads ----

export type NamingStrategy = "filename" | "uuid" | "uuid-filename";

export interface PresignUploadRequest {
  filename: string;
  contentType: string;
  /** Size in bytes. Max 50 MB (52,428,800). */
  contentLength: number;
  /** Optional folder prefix, e.g. "avatars". */
  path?: string;
  /** @default "filename" */
  naming?: NamingStrategy;
  /** Replace an existing object with the same name (filename mode). @default false */
  overwrite?: boolean;
}

export interface PresignUploadResponse {
  /** Signed R2 PUT URL. Send the file here with a plain fetch — no Authorization header. */
  uploadUrl: string;
  method: "PUT";
  bucket: string;
  key: string;
  naming: NamingStrategy;
  /** Durable public URL the object will be served from after upload. */
  publicUrl: string;
  /** Seconds until uploadUrl expires. */
  expiresIn: number;
  /** Headers that must be sent on the PUT exactly as given. */
  headers: {
    "Content-Type": string;
    "Content-Length": string;
  };
}

export interface UploadOptions {
  /** Object name. Required when uploading a Blob without a name; defaults to File.name. */
  filename?: string;
  /** Defaults to the file's own type, or "application/octet-stream". */
  contentType?: string;
  path?: string;
  naming?: NamingStrategy;
  overwrite?: boolean;
}

export interface UploadResult {
  key: string;
  publicUrl: string;
  bucket: string;
}

export interface DeleteUploadRequest {
  key: string;
}

export interface ListObjectsParams {
  /** Only return keys starting with this prefix. */
  prefix?: string;
  /** Continuation token from a previous page's nextCursor. */
  cursor?: string;
}

export interface StorageObject {
  key: string;
  /** ISO timestamp. */
  lastModified: string;
  /** Size in bytes. */
  size: number;
  /** Durable public URL. */
  url: string;
}

export interface ListObjectsResponse {
  objects: StorageObject[];
  nextCursor: string | null;
}

// ---- emails: history ----

export interface EmailLogEntry {
  id: string;
  /** Free-form category: "send" (default), "contact", or a custom value. */
  type: string;
  from: string;
  to: string[];
  subject: string;
  /** Provider (SES) message id. */
  messageId: string;
  /** Contact-form sends only: who submitted the form. */
  visitorEmail: string | null;
  /** Contact-form sends only: which site the form lives on. */
  source: string | null;
  /** ISO timestamp. */
  createdAt: string;
}

export interface ListEmailsParams {
  /** Rows per page. @default 50, max 100. */
  limit?: number;
  /** ISO cursor — pass the createdAt of the last row you received. */
  before?: string;
}

export interface ListEmailsResponse {
  emails: EmailLogEntry[];
}

export interface EmailHtmlResponse {
  /** Presigned R2 URL for the archived email HTML. */
  url: string;
  /** Seconds until the URL expires (~60). */
  expiresIn: number;
}

// ---- me ----

export interface AgencyUser {
  id: string;
  email: string;
  name: string | null;
  type: "user" | "admin";
  bucketName: string | null;
  publicBaseUrl: string | null;
  emailDomain: string | null;
  /** Origin rules the user's keys may be called from (admins skip the check). */
  allowedOrigins: string[];
  /** ISO timestamp. */
  createdAt: string;
}

export interface MeResponse {
  /** Prefix of the API key used for this request, e.g. "ak_pub_a1b2c3". */
  keyPrefix: string;
  /**
   * "public" for ak_pub_ keys (and legacy ak_live_ ones), which only work from
   * the user's allowed origins; "server" for ak_ser_ keys, which work from
   * anywhere and must never be shipped to a browser.
   */
  keyType: "public" | "server";
  user: AgencyUser;
}

// ---- admin (all /v1/admin/* routes require a key whose user is an admin) ----
// Keep in sync with:
//   src/routes/keys.ts        (publicCols, createSchema)
//   src/routes/users.ts       (createSchema, updateSchema, lookup)
//   src/routes/email-logs.ts  (GET /v1/admin/email-logs)
//   src/routes/envs.ts        (publicCols, createSchema, updateSchema)
//   src/routes/ses.ts         (EmailHealth)
//   src/lib/health.ts         (HealthResult)

export type ApiKeyType = "public" | "server";

export interface AdminApiKey {
  id: string;
  userId: string;
  /** e.g. "ak_pub_a1b2c3" — the key's first characters, safe to display. */
  prefix: string;
  /** Derived from the prefix; legacy ak_live_ keys report as "public". */
  type: ApiKeyType;
  /** ISO timestamp. */
  lastUsedAt: string | null;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp — set means the key no longer authenticates. */
  revokedAt: string | null;
}

/** GET /v1/admin/keys rows carry the owner's identity too. */
export interface AdminApiKeyWithOwner extends AdminApiKey {
  userEmail: string;
  userName: string | null;
}

export interface CreateApiKeyRequest {
  /** The key's owner — provide userId or email (exact match). */
  userId?: string;
  email?: string;
  /** @default "public" */
  type?: ApiKeyType;
}

/** The full key value is only returned at creation and via reveal. */
export interface CreatedApiKey extends AdminApiKey {
  key: string;
}

export interface MigrateLegacyEntry {
  userId: string;
  email: string;
  legacyKeyId: string;
  legacyPrefix: string;
  /** null in dry runs. */
  newKeyId: string | null;
  /** null in dry runs. */
  newKey: string | null;
}

export interface MigrateLegacyResponse {
  dryRun: boolean;
  migrated: MigrateLegacyEntry[];
  skipped: (Omit<MigrateLegacyEntry, "newKeyId" | "newKey"> & {
    reason: string;
  })[];
  next: string;
}

export interface CreateApiUserRequest {
  email: string;
  name?: string;
  /** @default "user" */
  type?: "user" | "admin";
  bucketName?: string | null;
  publicBaseUrl?: string | null;
  emailDomain?: string | null;
  /** Max 20. Bare domains ("acme.com") or exact origins ("https://acme.com"). */
  allowedOrigins?: string[];
  /** Type of the auto-minted key. @default "public" */
  keyType?: ApiKeyType;
}

export interface CreateApiUserResponse extends AgencyUser {
  apiKey: { id: string; prefix: string; key: string; type: ApiKeyType };
}

/** All optional; at least one field required. bucketName/publicBaseUrl must be set together. */
export interface UpdateApiUserRequest {
  email?: string;
  name?: string | null;
  type?: "user" | "admin";
  bucketName?: string | null;
  publicBaseUrl?: string | null;
  emailDomain?: string | null;
  /** Full-array replacement; [] clears. Max 20. */
  allowedOrigins?: string[];
}

/** Lookup: the merged user view plus every active key, decrypted. */
export interface LookupUserResponse extends AgencyUser {
  keys: {
    id: string;
    prefix: string;
    type: ApiKeyType;
    key: string;
    lastUsedAt: string | null;
    createdAt: string;
  }[];
}

export interface EmailStats {
  total: number;
  thisMonth: number;
  /** Per-type counts, e.g. { send: 12, contact: 3, newsletter: 4 }. */
  byType: Record<string, number>;
  /** ISO timestamp. */
  lastSentAt: string | null;
}

export interface AdminEmailLogEntry {
  id: string;
  type: string;
  fromAddress: string;
  to: string[];
  subject: string;
  visitorEmail: string | null;
  source: string | null;
  /** ISO timestamp. */
  createdAt: string;
}

export interface AdminEmailLogsParams {
  userId: string;
  /** Recent rows to return. @default 10, max 50. */
  limit?: number;
}

export interface AdminEmailLogsResponse {
  stats: EmailStats;
  emails: AdminEmailLogEntry[];
}

export interface EnvFileMeta {
  id: string;
  userId: string;
  description: string | null;
  varCount: number;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
}

/** List/get rows carry the owner's identity too. */
export interface EnvFileMetaWithOwner extends EnvFileMeta {
  userEmail: string;
  userName: string | null;
}

export interface CreateEnvFileRequest {
  /** The file's owner — provide userId or email (exact match). */
  userId?: string;
  email?: string;
  /** The raw .env content, stored encrypted. */
  content: string;
  description?: string;
}

export interface UpdateEnvFileRequest {
  content?: string;
  description?: string | null;
}

export interface SesHealth {
  account: {
    sendingEnabled: boolean;
    /** false = sandbox. */
    productionAccess: boolean;
    max24HourSend: number;
    maxSendRate: number;
    sentLast24Hours: number;
  };
  identities: {
    identity: string;
    type: "email" | "domain";
    verificationStatus: string;
    dkimEnabled?: boolean;
    dkimStatus?: string;
  }[];
  statistics: {
    timestamp: string;
    deliveryAttempts: number;
    bounces: number;
    complaints: number;
    rejects: number;
  }[];
}

export interface AdminHealthResult {
  ok: boolean;
  timestamp: string;
  checks: Record<string, { ok: boolean; latencyMs: number; error?: string }>;
}

// ---- marketing ----

export interface MarketingActRequest {
  /** Admin keys only: act on behalf of this user (the campaign owner). */
  userId?: string;
}

export interface MarketingSendResponse {
  /** Campaign id (also the workflow instance id). */
  id: string;
  /** Snapshotted recipient count (includes pre-suppressed rows). */
  recipients: number;
}

export interface MarketingTestResponse {
  /** Provider message id of the test send. */
  id: string;
}

export interface MarketingTransitionResponse {
  id: string;
  status: "paused" | "sending" | "canceled";
}

export interface MarketingSubscribeRequest {
  /** Visitor's email address. */
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface MarketingSubscribeResponse {
  /** Contact id in the owner's marketing list. */
  id: string;
  status: "subscribed";
}
