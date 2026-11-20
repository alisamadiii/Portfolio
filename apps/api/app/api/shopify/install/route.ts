import { NextResponse } from "next/server";

import { shopifySecret } from "@workspace/trpc/lib/shopify";
import { normalizeShop, verifyShopifyQueryHmac } from "@workspace/trpc/lib/shopify-shared";
import { urls } from "@workspace/ui/lib/company";

// ─── Shopify App URL ────────────────────────────────────────────
// Where Shopify sends a merchant who installs or opens the app from Shopify's
// side (?hmac&shop&timestamp). It carries no hub project, so it only checks
// the signature and hands the shop to the hub's Shopify page, which runs the
// normal connect (project picked from the workspace, signed state).

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const shop = normalizeShop(params.get("shop"));
  if (!shop || !verifyShopifyQueryHmac(params, shopifySecret())) {
    return NextResponse.redirect(`${urls.cms}/`, { status: 302 });
  }
  return NextResponse.redirect(`${urls.cms}/shopify?shop=${encodeURIComponent(shop)}`, { status: 302 });
}
