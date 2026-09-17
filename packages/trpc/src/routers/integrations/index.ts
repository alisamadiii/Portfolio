import { and, eq, inArray } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { account } from "@workspace/drizzle/schema";

import { authenticatedProcedure, createTRPCRouter } from "../../init";
import { INTEGRATIONS } from "../../lib/integrations";

// User-level app connections for the hub Integrations tab. Connect/disconnect
// happen through Better Auth directly (linkSocial / oauth2.link /
// unlinkAccount) — this router only reports status.

export const integrationsRouter = createTRPCRouter({
  // One account-table query answering "is each app connected?" for the caller.
  status: authenticatedProcedure.query(async ({ ctx }) => {
    const providerIds = [...new Set(INTEGRATIONS.map((i) => i.providerId))];
    const rows = await db
      .select({
        providerId: account.providerId,
        accountId: account.accountId,
        scope: account.scope,
        accessTokenExpiresAt: account.accessTokenExpiresAt,
        refreshToken: account.refreshToken,
      })
      .from(account)
      .where(
        and(
          eq(account.userId, ctx.session.user.id),
          inArray(account.providerId, providerIds)
        )
      );
    const now = Date.now();
    return INTEGRATIONS.map((integration) => {
      const row = rows.find(
        (r) =>
          r.providerId === integration.providerId &&
          (!integration.requiredScope ||
            r.scope?.includes(integration.requiredScope))
      );
      // Cheap DB-only health check: a token is dead only when its access token
      // has expired AND there's no refresh token to renew it (e.g. a provider
      // connected without offline access). Expired-but-refreshable is fine.
      const expired =
        !!row?.accessTokenExpiresAt &&
        row.accessTokenExpiresAt.getTime() < now;
      const needsReconnect = !!row && expired && !row.refreshToken;
      return {
        id: integration.id,
        providerId: integration.providerId,
        connected: !!row,
        needsReconnect,
        // Provider-side account id — needed by authClient.unlinkAccount.
        accountId: row?.accountId ?? null,
      };
    });
  }),
});
