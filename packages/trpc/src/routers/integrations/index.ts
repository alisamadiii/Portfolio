import { TRPCError } from "@trpc/server";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { account } from "@workspace/drizzle/schema";

import z from "zod";

import { authenticatedProcedure, createTRPCRouter } from "../../init";
import {
  getIntegrationAccessToken,
  INTEGRATIONS,
  type IntegrationId,
} from "../../lib/integrations";

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

  // Remove an integration's account link. Server-side instead of Better
  // Auth's unlink-account endpoint: that one runs freshSessionMiddleware and
  // rejects any session older than the freshness window, which made
  // disconnect silently unusable in practice.
  disconnect: authenticatedProcedure
    .input(
      z.object({
        id: z.enum(["google-analytics", "google-calendar", "github"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const integration = INTEGRATIONS.find((entry) => entry.id === input.id);
      if (!integration) throw new TRPCError({ code: "NOT_FOUND" });

      const rows = await db
        .select({
          id: account.id,
          scope: account.scope,
          accessToken: account.accessToken,
          refreshToken: account.refreshToken,
        })
        .from(account)
        .where(
          and(
            eq(account.userId, ctx.session.user.id),
            eq(account.providerId, integration.providerId)
          )
        );
      const target = integration.requiredScope
        ? rows.find((row) => row.scope?.includes(integration.requiredScope!))
        : rows[0];
      if (!target) return { success: true };

      const [{ total }] = (await db
        .select({ total: sql`count(*)` })
        .from(account)
        .where(eq(account.userId, ctx.session.user.id))) as [
        { total: number | string },
      ];
      if (Number(total) <= 1) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This is your only sign-in method, so it can't be removed.",
        });
      }

      // Best-effort revoke at Google so the grant disappears from the user's
      // Google account permissions too; the row delete is what matters.
      if (integration.providerId === "google") {
        const token = target.refreshToken ?? target.accessToken;
        if (token) {
          await fetch("https://oauth2.googleapis.com/revoke", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ token }),
          }).catch(() => {});
        }
      }

      await db.delete(account).where(eq(account.id, target.id));
      return { success: true };
    }),

  // Who the connected Google account actually is (email/name/avatar). The
  // account table only stores tokens + the numeric Google id, so this asks
  // Google's userinfo endpoint with the stored token — the sign-in profile
  // on `user` can be a different Google account than the integration one.
  profile: authenticatedProcedure
    .input(z.object({ id: z.enum(["google-analytics", "google-calendar"]) }))
    .query(async ({ ctx, input }) => {
      try {
        const token = await getIntegrationAccessToken(
          ctx.session.user.id,
          input.id as IntegrationId
        );
        const res = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return null;
        const data = (await res.json()) as {
          email?: string;
          name?: string;
          picture?: string;
        };
        return {
          email: data.email ?? null,
          name: data.name ?? null,
          picture: data.picture ?? null,
        };
      } catch {
        // Not connected / revoked — the status query drives that UI state.
        return null;
      }
    }),
});
