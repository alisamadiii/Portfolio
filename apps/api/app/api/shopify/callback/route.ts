import { headers as nextHeaders } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/pool";
import { hubProject, hubShopifyStore, user } from "@workspace/drizzle/schema";
import { resolveProjectRole } from "@workspace/trpc/lib/cms/project-access";
import {
  exchangeShopifyCode,
  isShopifyConfigured,
  registerShopifyWebhooks,
  sealTokens,
  SHOP_INFO_QUERY,
  shopifyGqlWith,
  shopifySecret,
  type ShopInfo,
} from "@workspace/trpc/lib/shopify";
import { normalizeShop, verifyShopifyQueryHmac, verifyShopifyState } from "@workspace/trpc/lib/shopify-shared";
import { urls } from "@workspace/ui/lib/company";

// ─── Shopify connect callback ───────────────────────────────────
// Shopify's consent screen redirects here with ?code&hmac&shop&state&timestamp.
// The query is signed with the app's secret, the state says which hub project
// and user started it (and for which shop), and the browser landing here must
// be signed in as that user, so a forwarded link can't bind someone else's
// shop to the sender's project.

type Result = "connected" | "taken" | "denied" | "error";

const back = (projectId: string | null, result: Result) =>
  NextResponse.redirect(
    projectId ? `${urls.cms}/p/${projectId}/shopify?shopify=${result}` : `${urls.cms}/`,
    { status: 302 }
  );

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const state = verifyShopifyState(params.get("state") ?? "", process.env.BETTER_AUTH_SECRET ?? "");
  if (!state) return back(null, "error");
  // The merchant pressed Cancel on the consent screen.
  if (params.get("error")) return back(state.projectId, "denied");
  const code = params.get("code");
  const shop = normalizeShop(params.get("shop"));
  if (!code || !shop || shop !== state.shop || !isShopifyConfigured()) return back(state.projectId, "error");
  if (!verifyShopifyQueryHmac(params, shopifySecret())) return back(state.projectId, "error");

  const session = await auth.api.getSession({ headers: await nextHeaders() }).catch(() => null);
  if (!session || session.user.id !== state.userId) return back(state.projectId, "error");

  try {
    // The user must still have full access to the project.
    const [project] = await db
      .select({ id: hubProject.id, githubConnectedUserId: hubProject.githubConnectedUserId })
      .from(hubProject)
      .where(eq(hubProject.id, state.projectId))
      .limit(1);
    const [caller] = await db
      .select({ id: user.id, email: user.email, role: user.role })
      .from(user)
      .where(eq(user.id, state.userId))
      .limit(1);
    if (!project || !caller) return back(state.projectId, "error");
    const role = await resolveProjectRole(caller, {
      projectId: project.id,
      githubConnectedUserId: project.githubConnectedUserId,
    });
    if (role !== "full-access") return back(state.projectId, "error");

    const taken = await db.query.hubShopifyStore.findFirst({ where: eq(hubShopifyStore.shopDomain, shop) });
    if (taken && taken.projectId !== project.id) return back(state.projectId, "taken");

    const tokens = await exchangeShopifyCode(shop, code);
    const { shop: info } = await shopifyGqlWith<ShopInfo>(shop, tokens.accessToken, SHOP_INFO_QUERY);
    const values = {
      shopDomain: shop,
      name: info.name,
      currency: info.currencyCode,
      timezone: info.ianaTimezone,
      planName: info.plan?.publicDisplayName ?? null,
      connectedUserId: caller.id,
      ...(await sealTokens(tokens)),
      updatedAt: new Date(),
    };
    // A project switching shops keeps its one row.
    await db
      .insert(hubShopifyStore)
      .values({ projectId: project.id, ...values })
      .onConflictDoUpdate({ target: hubShopifyStore.projectId, set: values });
    await registerShopifyWebhooks(shop, tokens.accessToken).catch((error) =>
      console.error("[shopify] webhook registration failed", shop, error)
    );
    return back(state.projectId, "connected");
  } catch (error) {
    console.error("Shopify connect callback failed", error);
    return back(state.projectId, "error");
  }
}
