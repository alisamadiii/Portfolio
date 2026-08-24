/**
 * HTTP-shaped errors + a Response mapper. Trimmed port of the hub engine's
 * packages/trpc/src/lib/cms/errors.ts (no tRPC).
 */

type ErrorLike = {
  status?: number;
  statusCode?: number;
  message?: string;
  headers?: HeadersInit;
};

export const createHttpError = (
  message: string,
  status: number,
  headers?: HeadersInit
) => {
  const error = new Error(message) as Error & {
    status: number;
    headers?: HeadersInit;
  };
  error.status = status;
  error.headers = headers;
  return error;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as ErrorLike).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return "Internal server error.";
};

const getErrorStatus = (error: unknown): number => {
  if (error && typeof error === "object") {
    const { status, statusCode } = error as ErrorLike;
    const explicitStatus = typeof status === "number" ? status : statusCode;
    if (
      typeof explicitStatus === "number" &&
      explicitStatus >= 400 &&
      explicitStatus <= 599
    ) {
      return explicitStatus;
    }
  }

  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("permission") ||
    message.includes("no access") ||
    message.includes("forbidden")
  )
    return 403;
  if (message.includes("not found")) return 404;
  if (message.includes("unauthorized") || message.includes("not signed in"))
    return 401;
  if (message.includes("conflict")) return 409;
  if (message.includes("rate limit")) return 429;
  if (message.includes("invalid") || message.includes("required")) return 400;

  return 500;
};

export const toErrorResponse = (error: unknown) => {
  const status = getErrorStatus(error);
  const headers =
    error && typeof error === "object"
      ? (error as ErrorLike).headers
      : undefined;

  return Response.json(
    { status: "error", message: getErrorMessage(error) },
    { status, headers }
  );
};
