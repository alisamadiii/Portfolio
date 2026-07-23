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

// ---- me ----

export interface AgencyUser {
  id: string;
  email: string;
  name: string | null;
  type: "user" | "admin";
  bucketName: string | null;
  publicBaseUrl: string | null;
  emailDomain: string | null;
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
