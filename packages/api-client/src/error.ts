// Every API error comes back as { error: { code, message, cause? } }
// (see ../../src/lib/errors.ts in the Worker). The client never throws for
// API or network failures — it returns { data: null, error: AgencyError }.

// Keep in sync with the ApiError codes in the Worker:
//   src/middleware/auth.ts, src/lib/validate.ts, src/lib/errors.ts,
//   src/routes/emails.ts, src/routes/uploads.ts, src/app.ts
export type AgencyErrorCode =
  // auth
  | "MISSING_API_KEY"
  | "UNKNOWN_API_KEY"
  | "API_KEY_REVOKED"
  | "ADMIN_REQUIRED"
  // request body
  | "INVALID_JSON"
  | "VALIDATION_FAILED"
  // emails
  | "EMAIL_DOMAIN_NOT_CONFIGURED"
  | "SENDER_DOMAIN_MISMATCH"
  | "RATE_LIMIT_EXCEEDED"
  | "EMAIL_PROVIDER_ERROR"
  | "EMAIL_NOT_CONFIGURED"
  // auth: origin allowlist (public keys only)
  | "ACCESS_DENIED"
  // admin: users/keys
  | "USER_NOT_FOUND"
  | "DUPLICATE_EMAIL"
  | "MISSING_EMAIL_PARAM"
  | "MISSING_USERID_PARAM"
  | "API_KEY_NOT_FOUND"
  // admin: R2/SES verification on user create/update
  | "BUCKET_NOT_FOUND"
  | "STORAGE_VERIFY_FAILED"
  | "PUBLIC_URL_UNREACHABLE"
  | "PUBLIC_URL_NOT_SERVING"
  | "PUBLIC_URL_WRONG_BUCKET"
  | "EMAIL_VERIFY_FAILED"
  | "EMAIL_DOMAIN_NOT_VERIFIED"
  // admin: envs
  | "ENV_FILE_NOT_FOUND"
  | "ENV_PASSWORD_INVALID"
  | "TOO_MANY_PASSWORD_ATTEMPTS"
  // emails: history
  | "INVALID_CURSOR"
  | "EMAIL_NOT_FOUND"
  // uploads
  | "BUCKET_NOT_CONFIGURED"
  | "STORAGE_NOT_CONFIGURED"
  | "INVALID_PATH"
  | "FILE_ALREADY_EXISTS"
  | "OBJECT_NOT_FOUND"
  | "STORAGE_DELETE_FAILED"
  | "STORAGE_LIST_FAILED"
  | "URL_NOT_YOUR_BUCKET"
  // generic fallbacks (plain HTTPExceptions, unknown routes)
  | "ROUTE_NOT_FOUND"
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "UPSTREAM_ERROR"
  | "REQUEST_ERROR"
  // client-side (never sent by the API)
  | "NETWORK_ERROR"
  | "UPLOAD_FAILED"
  | "MISSING_FILENAME"
  // non-envelope response fallback, e.g. "HTTP_502"
  | `HTTP_${number}`
  // future codes the API may add before this package updates
  | (string & {});

/**
 * Thrown synchronously by `emails.send()` when the combined size of all
 * attachments reaches the 1 MB limit — a caller mistake, distinct from the
 * `Result` envelope used for API/network outcomes.
 */
export class AttachmentTooLargeError extends Error {
  override readonly name = "AttachmentTooLargeError";

  constructor(
    /** Combined decoded size of the attachments, in bytes. */
    readonly totalBytes: number,
    /** The limit that was exceeded, in bytes (1,048,576 = 1 MB). */
    readonly limitBytes: number
  ) {
    super(
      `Attachments total ${totalBytes} bytes, which reaches the ${limitBytes}-byte (1 MB) limit.`
    );
  }
}

export class AgencyError extends Error {
  override readonly name = "AgencyError";

  constructor(
    /** HTTP status of the response, or 0 for network failures. */
    readonly status: number,
    /** Stable UPPER_SNAKE_CASE identifier, safe to branch on. */
    readonly code: AgencyErrorCode,
    message: string,
    /** Optional hint: why it happened / how to fix it. */
    readonly causeHint?: string
  ) {
    super(message);
  }
}

export type Result<T> =
  { data: T; error: null } | { data: null; error: AgencyError };

export function ok<T>(data: T): Result<T> {
  return { data, error: null };
}

export function fail<T>(error: AgencyError): Result<T> {
  return { data: null, error };
}
