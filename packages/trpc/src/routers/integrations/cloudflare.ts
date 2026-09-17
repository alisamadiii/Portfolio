import "server-only";

import { TRPCError } from "@trpc/server";

import { authenticatedProcedure, createTRPCRouter } from "../../init";
import { getIntegrationAccessToken, reconnectError } from "../../lib/integrations";

// ─── Cloudflare integration ──────────────────────────────────────
// REST client + tRPC procedures for the connected user's Cloudflare account,
// running on the OAuth token Better Auth stored at connect time. Raw fetch,
// matching the analytics client. Connect-only for now — the helpers back
// future zone/DNS/Workers features and admin-side DNS management.

const CF_BASE = "https://api.cloudflare.com/client/v4";

type CfEnvelope<T> = {
  success: boolean;
  errors?: { code?: number; message?: string }[];
  result: T;
};

async function cf<T>(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${CF_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401 || res.status === 403) {
    throw reconnectError("Cloudflare");
  }
  const data = (await res.json().catch(() => null)) as CfEnvelope<T> | null;
  if (!res.ok || !data?.success) {
    const detail = data?.errors?.map((e) => e.message).join("; ") ?? "";
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: `Cloudflare API error (${res.status}): ${detail.slice(0, 300)}`,
    });
  }
  return data.result;
}

export type CfAccount = { id: string; name: string };

/** Accounts the token's user granted access to. */
export const listCfAccounts = (accessToken: string) =>
  cf<CfAccount[]>("/accounts?per_page=50", accessToken);

export type CfZone = { id: string; name: string; status: string };

/** Zones (domains) the token can read — all of them, or scoped to one account. */
export const listCfZones = (accessToken: string, accountId?: string) =>
  cf<CfZone[]>(
    accountId
      ? `/zones?account.id=${encodeURIComponent(accountId)}&per_page=100`
      : "/zones?per_page=100",
    accessToken
  );

export type CfDnsRecord = {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
};

export const listCfDnsRecords = (accessToken: string, zoneId: string) =>
  cf<CfDnsRecord[]>(`/zones/${zoneId}/dns_records?per_page=200`, accessToken);

export type CfDnsRecordInput = {
  type: string;
  name: string;
  content: string;
  proxied?: boolean;
  ttl?: number;
};

export const createCfDnsRecord = (
  accessToken: string,
  zoneId: string,
  record: CfDnsRecordInput
) =>
  cf<CfDnsRecord>(`/zones/${zoneId}/dns_records`, accessToken, {
    method: "POST",
    body: JSON.stringify(record),
  });

export const updateCfDnsRecord = (
  accessToken: string,
  zoneId: string,
  recordId: string,
  record: CfDnsRecordInput
) =>
  cf<CfDnsRecord>(`/zones/${zoneId}/dns_records/${recordId}`, accessToken, {
    method: "PUT",
    body: JSON.stringify(record),
  });

export const deleteCfDnsRecord = (
  accessToken: string,
  zoneId: string,
  recordId: string
) =>
  cf<{ id: string }>(`/zones/${zoneId}/dns_records/${recordId}`, accessToken, {
    method: "DELETE",
  });

export type CfWorker = { id: string; created_on?: string; modified_on?: string };

export const listCfWorkers = (accessToken: string, accountId: string) =>
  cf<CfWorker[]>(`/accounts/${accountId}/workers/scripts`, accessToken);

// ─── Router ──────────────────────────────────────────────────────
// Connect-only phase: accounts serves as the post-connect sanity check ("what
// did the user grant?"). Zone/DNS/Workers procedures land here as features
// ship, on the same token helper + client above.

export const cloudflareRouter = createTRPCRouter({
  accounts: authenticatedProcedure.query(async ({ ctx }) => {
    const token = await getIntegrationAccessToken(
      ctx.session.user.id,
      "cloudflare",
      "Cloudflare"
    );
    return listCfAccounts(token);
  }),
});
