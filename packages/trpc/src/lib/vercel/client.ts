/**
 * Minimal Vercel REST API client. All client projects live on one Pro team,
 * so a single token/teamId env pair covers everything.
 */

import { TRPCError } from "@trpc/server";

import { createHttpError } from "@workspace/trpc/lib/cms/errors";

const getVercelEnv = () => {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !teamId) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "VERCEL_TOKEN and VERCEL_TEAM_ID must be set",
    });
  }

  return { token, teamId };
};

type VercelFetchOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  searchParams?: Record<string, string>;
};

// Fetch against api.vercel.com, always scoped to the team. On failure throws
// an HttpError carrying Vercel's own error message (e.g. "domain already in
// use") so toTRPCError surfaces it to the UI verbatim.
const vercelFetch = async <T>(
  path: string,
  { method = "GET", body, searchParams }: VercelFetchOptions = {}
): Promise<T> => {
  const { token, teamId } = getVercelEnv();

  const url = new URL(`https://api.vercel.com${path}`);
  url.searchParams.set("teamId", teamId);
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data as { error?: { message?: string } } | null)?.error?.message ??
      `Vercel API request failed (${response.status})`;
    throw createHttpError(message, response.status);
  }

  return data as T;
};

export { getVercelEnv, vercelFetch };
