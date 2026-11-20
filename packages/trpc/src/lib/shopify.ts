import "server-only";

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";

import { readAccountToken, sealAccountToken } from "@workspace/auth/tokens";
import { db } from "@workspace/drizzle/pool";
import { hubShopifyStore } from "@workspace/drizzle/schema";

import { SHOPIFY_API_VERSION, SHOPIFY_SCOPES } from "./shopify-shared";

// ─── Shopify Admin API (the agency's one public app, every client's shop) ───
// Authorization code grant with expiring offline tokens: the access token
// lives an hour, the refresh token 90 days and rotates on every refresh, so
// a refresh must never run twice at once for a shop (the row is locked while
// it runs). Orders and products are read live through GraphQL; nothing but
// the shop and its tokens is stored.

export const isShopifyConfigured = () =>
  Boolean(process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET);

const clientId = () => process.env.SHOPIFY_CLIENT_ID ?? "";
export const shopifySecret = () => process.env.SHOPIFY_CLIENT_SECRET ?? "";

export const shopifyCallbackUrl = () =>
  new URL("/api/shopify/callback", process.env.NEXT_PUBLIC_API_URL).toString();

export const shopifyWebhookUrl = () =>
  new URL("/api/webhook/shopify", process.env.NEXT_PUBLIC_API_URL).toString();

/** Shopify's consent screen on the merchant's own shop. */
export function shopifyAuthorizeUrl(shop: string, state: string) {
  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", clientId());
  url.searchParams.set("scope", SHOPIFY_SCOPES);
  url.searchParams.set("redirect_uri", shopifyCallbackUrl());
  url.searchParams.set("state", state);
  return url.toString();
}

export class ShopifyApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

type TokenResponse = {
  access_token?: string;
  scope?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  error?: string;
  error_description?: string;
};

export type ShopifyTokens = {
  accessToken: string;
  scope: string | null;
  accessExpiresAt: Date | null;
  refreshToken: string | null;
  refreshExpiresAt: Date | null;
};

async function postToken(shop: string, body: Record<string, string>): Promise<ShopifyTokens> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ client_id: clientId(), client_secret: shopifySecret(), ...body }),
  });
  const json = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !json.access_token) {
    throw new ShopifyApiError(res.status, json.error_description ?? json.error ?? `Shopify token request failed (${res.status})`);
  }
  const now = Date.now();
  return {
    accessToken: json.access_token,
    scope: json.scope ?? null,
    accessExpiresAt: json.expires_in ? new Date(now + json.expires_in * 1000) : null,
    refreshToken: json.refresh_token ?? null,
    refreshExpiresAt: json.refresh_token_expires_in ? new Date(now + json.refresh_token_expires_in * 1000) : null,
  };
}

/** The callback's code → an expiring offline token pair. */
export const exchangeShopifyCode = (shop: string, code: string) =>
  postToken(shop, { code, expiring: "1" });

/** Encrypted column values for a token pair. */
export async function sealTokens(t: ShopifyTokens) {
  return {
    scope: t.scope,
    accessTokenEnc: await sealAccountToken(t.accessToken),
    accessExpiresAt: t.accessExpiresAt,
    refreshTokenEnc: t.refreshToken ? await sealAccountToken(t.refreshToken) : null,
    refreshExpiresAt: t.refreshExpiresAt,
  };
}

export const shopifyStoreFor = (projectId: string) =>
  db.query.hubShopifyStore.findFirst({ where: eq(hubShopifyStore.projectId, projectId) });

type StoreRow = NonNullable<Awaited<ReturnType<typeof shopifyStoreFor>>>;

const REFRESH_MARGIN_MS = 5 * 60_000;

const reconnect = () =>
  new TRPCError({ code: "PRECONDITION_FAILED", message: "Shopify needs you to reconnect the store." });

const fresh = (row: Pick<StoreRow, "accessTokenEnc" | "accessExpiresAt">) =>
  Boolean(row.accessTokenEnc) &&
  (!row.accessExpiresAt || row.accessExpiresAt.getTime() - REFRESH_MARGIN_MS > Date.now());

/**
 * A live access token for the shop, refreshed when it's about to expire. The
 * refresh runs inside a row lock: Shopify rotates the refresh token, so two
 * parallel refreshes would leave the stored one dead.
 */
export async function shopifyAccessToken(row: StoreRow): Promise<string> {
  if (!row.accessTokenEnc) throw reconnect();
  if (fresh(row)) return (await readAccountToken(row.accessTokenEnc))!;

  // null = Shopify refused the refresh; thrown after the transaction so the cleared token commits.
  const token = await db.transaction(async (tx): Promise<string | null> => {
    const [locked] = await tx
      .select()
      .from(hubShopifyStore)
      .where(eq(hubShopifyStore.id, row.id))
      .for("update");
    if (!locked?.accessTokenEnc) throw reconnect();
    // Another request refreshed while this one waited for the lock.
    if (fresh(locked)) return (await readAccountToken(locked.accessTokenEnc))!;

    const refreshToken = await readAccountToken(locked.refreshTokenEnc);
    if (!refreshToken) throw reconnect();
    let tokens: ShopifyTokens;
    try {
      tokens = await postToken(locked.shopDomain, { grant_type: "refresh_token", refresh_token: refreshToken });
    } catch (error) {
      // 400/401 = the refresh token is spent or revoked; anything else is transient.
      if (error instanceof ShopifyApiError && (error.status === 400 || error.status === 401)) {
        await tx
          .update(hubShopifyStore)
          .set({ accessTokenEnc: null, updatedAt: new Date() })
          .where(eq(hubShopifyStore.id, locked.id));
        return null;
      }
      throw error;
    }
    const sealed = await sealTokens(tokens);
    await tx
      .update(hubShopifyStore)
      .set({
        ...sealed,
        scope: sealed.scope ?? locked.scope,
        refreshTokenEnc: sealed.refreshTokenEnc ?? locked.refreshTokenEnc,
        refreshExpiresAt: sealed.refreshExpiresAt ?? locked.refreshExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(hubShopifyStore.id, locked.id));
    return tokens.accessToken;
  });
  if (!token) throw reconnect();
  return token;
}

type GqlResponse<T> = {
  data?: T;
  errors?: { message: string; extensions?: { code?: string } }[];
};

/** One Admin GraphQL call with a known token. Retries once when Shopify throttles. */
export async function shopifyGqlWith<T>(
  shop: string,
  token: string,
  query: string,
  variables?: Record<string, unknown>,
  attempt = 0
): Promise<T> {
  const res = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  if (res.status === 429 && attempt === 0) {
    await new Promise((r) => setTimeout(r, 1000));
    return shopifyGqlWith(shop, token, query, variables, 1);
  }
  const json = (await res.json().catch(() => ({}))) as GqlResponse<T>;
  if (!res.ok) throw new ShopifyApiError(res.status, json.errors?.[0]?.message ?? `Shopify answered ${res.status}`);
  if (json.errors?.length) {
    if (json.errors.some((e) => e.extensions?.code === "THROTTLED") && attempt === 0) {
      await new Promise((r) => setTimeout(r, 1000));
      return shopifyGqlWith(shop, token, query, variables, 1);
    }
    const denied = json.errors.some((e) => e.extensions?.code === "ACCESS_DENIED");
    throw new ShopifyApiError(denied ? 403 : 502, json.errors[0]!.message);
  }
  return json.data as T;
}

/** Admin GraphQL on a project's shop. */
export async function shopifyGql<T>(row: StoreRow, query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = await shopifyAccessToken(row);
  return shopifyGqlWith<T>(row.shopDomain, token, query, variables);
}

/** Throws the first mutation userError as a 400 the UI can show. */
export function assertNoUserErrors(errors: { message: string }[] | null | undefined) {
  if (errors?.length) throw new TRPCError({ code: "BAD_REQUEST", message: errors[0]!.message });
}

/** Key for mutations that need @idempotent (refunds, inventory) since 2026-04. */
export const idempotencyKey = () => randomUUID();

export type ShopInfo = {
  shop: { name: string; currencyCode: string; ianaTimezone: string | null; plan: { publicDisplayName: string } | null };
};

export const SHOP_INFO_QUERY = /* GraphQL */ `
  query ShopInfo {
    shop {
      name
      currencyCode
      ianaTimezone
      plan {
        publicDisplayName
      }
    }
  }
`;

/** app/uninstalled lands on /api/webhook/shopify; compliance topics are set in the Dev Dashboard. */
export async function registerShopifyWebhooks(shop: string, token: string) {
  const data = await shopifyGqlWith<{
    webhookSubscriptionCreate: { userErrors: { message: string }[] };
  }>(
    shop,
    token,
    /* GraphQL */ `
      mutation Uninstalled($uri: String!) {
        webhookSubscriptionCreate(topic: APP_UNINSTALLED, webhookSubscription: { uri: $uri, format: JSON }) {
          userErrors {
            message
          }
        }
      }
    `,
    { uri: shopifyWebhookUrl() }
  );
  const errors = data.webhookSubscriptionCreate.userErrors;
  // "Address for this topic has already been taken" on a reconnect is fine.
  if (errors.length && !errors.every((e) => /already been taken/i.test(e.message))) {
    console.error("[shopify] webhook registration", shop, errors);
  }
}

/** Revokes the app on the shop (best effort), so a disconnect really ends access. */
async function revokeShopify(row: StoreRow) {
  try {
    const token = await shopifyAccessToken(row);
    await fetch(`https://${row.shopDomain}/admin/api_permissions/current.json`, {
      method: "DELETE",
      headers: { "X-Shopify-Access-Token": token },
    });
  } catch (error) {
    console.error("[shopify] revoke failed", row.shopDomain, error);
  }
}

/** Disconnect / project delete: revoke on Shopify, then drop the rows. */
export async function deleteShopifyRows(projectIds: string[]) {
  if (!projectIds.length) return;
  const rows = await db.select().from(hubShopifyStore).where(inArray(hubShopifyStore.projectId, projectIds));
  if (isShopifyConfigured()) await Promise.all(rows.map(revokeShopify));
  await db.delete(hubShopifyStore).where(inArray(hubShopifyStore.projectId, projectIds));
}

/** app/uninstalled and shop/redact: the shop is gone, so is its row. */
export const forgetShopifyShop = (shop: string) =>
  db.delete(hubShopifyStore).where(eq(hubShopifyStore.shopDomain, shop));

export const toTRPC = (error: unknown, fallback: string): TRPCError => {
  if (error instanceof TRPCError) return error;
  if (error instanceof ShopifyApiError) {
    return new TRPCError({
      code:
        error.status === 401
          ? "PRECONDITION_FAILED"
          : error.status === 403
            ? "FORBIDDEN"
            : error.status === 404
              ? "NOT_FOUND"
              : error.status === 429
                ? "TOO_MANY_REQUESTS"
                : "BAD_GATEWAY",
      message:
        error.status === 401
          ? "Shopify stopped accepting the hub's access. Reconnect the store."
          : error.status === 403
            ? "Shopify didn't allow that. Reconnect the store to grant the missing access."
            : error.message || fallback,
    });
  }
  return new TRPCError({ code: "BAD_GATEWAY", message: fallback });
};
