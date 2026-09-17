import { and, eq, inArray } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { account } from "@workspace/drizzle/schema";

import { authenticatedProcedure, createTRPCRouter } from "../../init";
import { INTEGRATIONS } from "../../lib/integrations";
import { cloudflareRouter } from "./cloudflare";

// User-level app connections for the hub Integrations tab. Connect/disconnect
// happen through Better Auth directly (linkSocial / oauth2.link /
// unlinkAccount) — this router only reports status and namespaces each app's
// future feature procedures (integrations.cloudflare.*, …).

export const integrationsRouter = createTRPCRouter({
  cloudflare: cloudflareRouter,

  // One account-table query answering "is each app connected?" for the caller.
  status: authenticatedProcedure.query(async ({ ctx }) => {
    const providerIds = [...new Set(INTEGRATIONS.map((i) => i.providerId))];
    const rows = await db
      .select({
        providerId: account.providerId,
        accountId: account.accountId,
        scope: account.scope,
      })
      .from(account)
      .where(
        and(
          eq(account.userId, ctx.session.user.id),
          inArray(account.providerId, providerIds)
        )
      );
    return INTEGRATIONS.map((integration) => {
      const row = rows.find(
        (r) =>
          r.providerId === integration.providerId &&
          (!integration.requiredScope ||
            r.scope?.includes(integration.requiredScope))
      );
      return {
        id: integration.id,
        providerId: integration.providerId,
        connected: !!row,
        // Provider-side account id — needed by authClient.unlinkAccount.
        accountId: row?.accountId ?? null,
      };
    });
  }),
});
