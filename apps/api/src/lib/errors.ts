import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

// Standard error shape for every error the API returns:
//   { "error": { "code": "USER_NOT_FOUND", "message": "...", "cause": "..." } }
// code    — stable machine-readable identifier (UPPER_SNAKE_CASE), safe to branch on.
// message — human-readable, one line.
// cause   — optional: why it happened / how to fix it.
export class ApiError extends HTTPException {
  readonly code: string;
  readonly causeHint?: string;

  constructor(
    status: ContentfulStatusCode,
    code: string,
    message: string,
    causeHint?: string
  ) {
    super(status, { message });
    this.code = code;
    this.causeHint = causeHint;
  }
}

// Same wire shape as ApiError, but onError does NOT send it to PostHog.
// Use when the event is uninteresting or when the call site captures its own
// richer telemetry before throwing.
export class ExpectedError extends ApiError {}

// Fallback codes for plain HTTPExceptions (e.g. thrown by Hono itself).
const statusCodes: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  405: "METHOD_NOT_ALLOWED",
  409: "CONFLICT",
  413: "PAYLOAD_TOO_LARGE",
  429: "RATE_LIMITED",
  500: "INTERNAL_ERROR",
  502: "UPSTREAM_ERROR",
};

export function codeForStatus(status: number): string {
  return (
    statusCodes[status] ?? (status >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR")
  );
}
