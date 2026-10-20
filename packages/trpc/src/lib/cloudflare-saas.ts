import { TRPCError } from "@trpc/server";

/**
 * Cloudflare for SaaS custom hostnames: the customer CNAMEs their subdomain to
 * our fallback origin; Cloudflare validates it, issues the edge certificate,
 * and proxies to the VPS with the original Host header. Free tier covers 100
 * custom hostnames.
 *
 * Env:
 *  - CF_API_TOKEN        token with Zone > SSL and Certificates > Edit (+ Zone
 *                        Read), limited to the SaaS zone
 *  - CF_SAAS_ZONE_ID     the zone custom hostnames live on (alisamadii.dev)
 *  - CF_SAAS_CNAME_TARGET the record customers point their CNAME at
 *                        (fallback.alisamadii.dev, proxied, set as the zone's
 *                        fallback origin)
 */

const CF_API = "https://api.cloudflare.com/client/v4";

export type CustomHostname = {
  id: string;
  hostname: string;
  /** Hostname (ownership) validation status, 'active' when verified. */
  status: string;
  ssl: {
    status: string;
    validation_errors?: { message: string }[];
  };
};

type CfEnvelope<T> = {
  success: boolean;
  errors?: { code?: number; message?: string }[];
  result: T;
};

const config = () => {
  const token = process.env.CF_API_TOKEN;
  const zoneId = process.env.CF_SAAS_ZONE_ID;
  const cnameTarget = process.env.CF_SAAS_CNAME_TARGET;
  if (!token || !zoneId || !cnameTarget) return null;
  return { token, zoneId, cnameTarget };
};

export const isCloudflareSaasConfigured = (): boolean => config() !== null;

/** The CNAME value customers must point their subdomain at. */
export const saasCnameTarget = (): string =>
  process.env.CF_SAAS_CNAME_TARGET || "";

const requireConfig = () => {
  const value = config();
  if (!value) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Custom domains are not configured on this server.",
    });
  }
  return value;
};

const cfFetch = async <T>(
  path: string,
  init?: RequestInit
): Promise<CfEnvelope<T>> => {
  const { token, zoneId } = requireConfig();
  let res: Response;
  try {
    res = await fetch(`${CF_API}/zones/${zoneId}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        ...init?.headers,
      },
    });
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Cloudflare unreachable: ${
        error instanceof Error ? error.message : "network error"
      }`,
    });
  }
  const body = (await res.json().catch(() => null)) as CfEnvelope<T> | null;
  if (!body) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Cloudflare returned an unreadable response (${res.status}).`,
    });
  }
  return body;
};

const firstError = (envelope: CfEnvelope<unknown>) =>
  envelope.errors?.[0]?.message ?? "Cloudflare request failed.";

const throwCfError = (envelope: CfEnvelope<unknown>): never => {
  const message = firstError(envelope);
  // Free-tier custom hostname quota exceeded.
  if (/quota|limit/i.test(message)) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Custom hostname limit reached on this server.",
    });
  }
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
};

export async function createCustomHostname(
  hostname: string
): Promise<CustomHostname> {
  const envelope = await cfFetch<CustomHostname>("/custom_hostnames", {
    method: "POST",
    body: JSON.stringify({
      hostname,
      ssl: {
        method: "http",
        type: "dv",
        settings: { min_tls_version: "1.2" },
      },
    }),
  });
  if (!envelope.success) throwCfError(envelope);
  return envelope.result;
}

/** Adopt an existing custom hostname on retried setups (null when none). */
export async function findCustomHostnameByName(
  hostname: string
): Promise<CustomHostname | null> {
  const envelope = await cfFetch<CustomHostname[]>(
    `/custom_hostnames?hostname=${encodeURIComponent(hostname)}`
  );
  if (!envelope.success) throwCfError(envelope);
  return envelope.result?.[0] ?? null;
}

/** Null when the hostname no longer exists on Cloudflare. */
export async function getCustomHostname(
  id: string
): Promise<CustomHostname | null> {
  const envelope = await cfFetch<CustomHostname>(
    `/custom_hostnames/${encodeURIComponent(id)}`
  );
  if (!envelope.success) {
    if (envelope.errors?.some((e) => e.code === 1436 || /not found/i.test(e.message ?? ""))) {
      return null;
    }
    throwCfError(envelope);
  }
  return envelope.result;
}

/** 404-tolerant delete. */
export async function deleteCustomHostname(id: string): Promise<void> {
  const envelope = await cfFetch<unknown>(
    `/custom_hostnames/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
  if (
    !envelope.success &&
    !envelope.errors?.some((e) => /not found/i.test(e.message ?? ""))
  ) {
    throwCfError(envelope);
  }
}
