import "server-only";

import { TRPCError } from "@trpc/server";

import { auth } from "@workspace/auth/auth";

import { reconnectError } from "./integrations";

// ─── Resend API (client's own account, via OAuth) ────────────────
// Raw REST, no SDK. The project's Resend app reads the client's domains and
// recent emails and mints API keys, with the OAuth token of the user who
// connected Resend to the project (hub_project.resendConnectedUserId).

const BASE = "https://api.resend.com";

// Access tokens live 15 minutes and every refresh ROTATES the refresh token:
// two concurrent refreshes would replay a spent refresh token and can kill
// the grant. So one token per linked team is cached here and refreshes are
// shared. A user can link several teams (one per project): the token is
// always resolved for an explicit account row (user + Resend team id).
const cache = new Map<string, { token: string; exp: number }>();
const inflight = new Map<string, Promise<string>>();

const jwtExp = (token: string) => {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")
    ) as { exp?: number };
    return payload.exp ? payload.exp * 1000 : Date.now() + 60_000;
  } catch {
    return Date.now() + 60_000;
  }
};

const fetchToken = async (userId: string, accountId: string) => {
  try {
    const res = await auth.api.getAccessToken({
      body: { providerId: "resend", userId, accountId },
    });
    const token = (res as { accessToken?: string } | null)?.accessToken;
    if (!token) throw reconnectError("Resend");
    return token;
  } catch {
    throw reconnectError("Resend");
  }
};

export async function resendTokenFor(
  userId: string,
  accountId: string
): Promise<string> {
  const key = `${userId}:${accountId}`;
  const hit = cache.get(key);
  if (hit && hit.exp - 60_000 > Date.now()) return hit.token;
  const pending = inflight.get(key);
  if (pending) return pending;
  const next = fetchToken(userId, accountId)
    .then((token) => {
      cache.set(key, { token, exp: jwtExp(token) });
      return token;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, next);
  return next;
}

/** Drops the cached token (disconnect). */
export const forgetResendToken = (userId: string, accountId: string) =>
  cache.delete(`${userId}:${accountId}`);

/** Ends the grant at Resend (revoking the refresh token revokes it all). */
export const revokeResendGrant = (refreshToken: string) =>
  fetch(`${BASE}/oauth/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.RESEND_CLIENT_ID ?? "",
      client_secret: process.env.RESEND_CLIENT_SECRET ?? "",
      token: refreshToken,
      token_type_hint: "refresh_token",
    }),
  }).catch(() => undefined);

async function resend<T>(
  token: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new TRPCError({
      code: res.status === 401 ? "PRECONDITION_FAILED" : "INTERNAL_SERVER_ERROR",
      message:
        res.status === 401
          ? "Resend needs to be reconnected."
          : `Resend: ${body?.message ?? res.status}`,
    });
  }
  return (await res.json()) as T;
}

export type ResendDomain = {
  id: string;
  name: string;
  status: string;
  region: string | null;
  created_at: string;
};

export type ResendDomainRecord = {
  record: string;
  name: string;
  type: string;
  value: string;
  status: string;
  priority?: number | null;
};

export type ResendEmail = {
  id: string;
  to: string[] | string;
  subject: string | null;
  last_event: string | null;
  created_at: string;
};

export const listResendDomains = async (token: string) =>
  (await resend<{ data: ResendDomain[] }>(token, "/domains")).data ?? [];

export const getResendDomain = (token: string, domainId: string) =>
  resend<ResendDomain & { records?: ResendDomainRecord[] }>(
    token,
    `/domains/${encodeURIComponent(domainId)}`
  );

export const listResendEmails = async (token: string) =>
  (await resend<{ data: ResendEmail[] }>(token, "/emails?limit=20")).data ?? [];

export type ResendApiKey = {
  id: string;
  name: string;
  created_at: string;
  last_used_at?: string | null;
};

/** Key metadata only: Resend never returns a key's secret after creation. */
export const listResendApiKeys = async (token: string) =>
  (await resend<{ data: ResendApiKey[] }>(token, "/api-keys")).data ?? [];

export const deleteResendApiKey = async (token: string, keyId: string) => {
  const res = await fetch(`${BASE}/api-keys/${encodeURIComponent(keyId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new TRPCError({
      code: res.status === 401 ? "PRECONDITION_FAILED" : "INTERNAL_SERVER_ERROR",
      message:
        res.status === 401
          ? "Resend needs to be reconnected."
          : "Resend couldn't delete that key.",
    });
  }
};

/** Mints a sending-only API key. The token is returned once by Resend. */
export const createResendApiKey = (
  token: string,
  params: { name: string; domainId?: string }
) =>
  resend<{ id: string; token: string }>(token, "/api-keys", {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      permission: "sending_access",
      ...(params.domainId ? { domain_id: params.domainId } : {}),
    }),
  });
