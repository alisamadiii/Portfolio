import "server-only";

import { createTRPCClient, httpBatchLink } from "@trpc/client";

import type { AppRouter } from "./routers/_app";

function getApiUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_URL must be set for HTTP caller");
  }
  return `${base.replace(/\/$/, "")}/api/trpc`;
}

/**
 * Creates a tRPC client that calls the API via HTTP with the given headers forwarded.
 * Use this for server-side calls when the API lives on a different app (e.g., admin → dashboard).
 * Forwards cookies so the API can verify the session.
 */
/**
 * Creates a tRPC client for server-to-server calls to internal procedures,
 * authenticated with the shared INTERNAL_API_SECRET instead of a session.
 */
export function createInternalCaller() {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    throw new Error("INTERNAL_API_SECRET must be set for internal caller");
  }

  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: getApiUrl(),
        fetch(url, options) {
          return fetch(url, {
            ...options,
            headers: {
              ...options?.headers,
              "x-internal-secret": secret,
            },
          });
        },
      }),
    ],
  });
}

export function createHttpCaller(headers: Headers) {
  const cookie = headers.get("cookie");

  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: getApiUrl(),
        fetch(url, options) {
          return fetch(url, {
            ...options,
            headers: {
              ...options?.headers,
              ...(cookie ? { Cookie: cookie } : {}),
            },
            credentials: "include",
          });
        },
      }),
    ],
  });
}
