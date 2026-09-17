import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { auth } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import { account } from "@workspace/drizzle/schema";

// ─── Integrations core ───────────────────────────────────────────
// User-level third-party app connections for the hub Integrations tab. Every
// app rides on Better Auth's account table: social providers (google, github)
// link with extra scopes via linkSocial, custom providers (cloudflare) via the
// genericOAuth plugin — so connection status is just "does a row with the right
// provider + scope exist" and tokens refresh through auth.api.getAccessToken.
// Adding an app = one INTEGRATIONS entry here + a client-side registry entry
// (+ a genericOAuth config block in @workspace/auth if it's a new provider).

export const GA_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
export const GITHUB_REPO_SCOPE = "repo";

export type IntegrationId = "google-analytics" | "github" | "cloudflare";

type IntegrationProvider = {
  id: IntegrationId;
  /** Better Auth providerId — the account.provider_id value. */
  providerId: string;
  /** Connected only when the account row's scope list includes this. */
  requiredScope?: string;
};

export const INTEGRATIONS: IntegrationProvider[] = [
  { id: "google-analytics", providerId: "google", requiredScope: GA_SCOPE },
  { id: "github", providerId: "github", requiredScope: GITHUB_REPO_SCOPE },
  { id: "cloudflare", providerId: "cloudflare" },
];

/** The integration's token is missing/expired/unscoped — the UI must prompt a reconnect. */
export const reconnectError = (name: string) =>
  new TRPCError({
    code: "PRECONDITION_FAILED",
    message: `${name} needs to be reconnected.`,
  });

type ConnectedAccount = { accountId: string; scope: string | null };

/**
 * Find the user's account row for a provider, preferring the row whose scope
 * includes requiredScope — a user can hold multiple rows per provider
 * (accountLinking allows linking a different account than the sign-in one),
 * and the sign-in row usually lacks the integration scope.
 */
export async function getConnectedAccount(
  userId: string,
  providerId: string,
  requiredScope?: string
): Promise<ConnectedAccount | null> {
  if (!userId) return null;
  const rows = await db
    .select({ accountId: account.accountId, scope: account.scope })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, providerId)));
  if (!requiredScope) return rows[0] ?? null;
  return rows.find((row) => row.scope?.includes(requiredScope)) ?? null;
}

/**
 * Fetch a usable access token for an integration, refreshing it via the stored
 * refresh token when needed. Throws a PRECONDITION_FAILED reconnect error when
 * the user has no properly-scoped linked account or the token can't be
 * refreshed (revoked / never offline).
 */
export async function getIntegrationAccessToken(
  userId: string,
  integrationId: IntegrationId,
  errorName = "This integration"
): Promise<string> {
  const integration = INTEGRATIONS.find((entry) => entry.id === integrationId);
  if (!integration) throw reconnectError(errorName);
  const connected = await getConnectedAccount(
    userId,
    integration.providerId,
    integration.requiredScope
  );
  if (!connected) throw reconnectError(errorName);
  try {
    const res = await auth.api.getAccessToken({
      body: {
        providerId: integration.providerId,
        userId,
        accountId: connected.accountId,
      },
    });
    const token = (res as { accessToken?: string } | null)?.accessToken;
    if (!token) throw reconnectError(errorName);
    return token;
  } catch (err) {
    if (err instanceof TRPCError) throw err;
    throw reconnectError(errorName);
  }
}
