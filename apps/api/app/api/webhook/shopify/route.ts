import { forgetShopifyShop, shopifySecret } from "@workspace/trpc/lib/shopify";
import { normalizeShop, verifyShopifyWebhook } from "@workspace/trpc/lib/shopify-shared";

// ─── Shopify webhooks ────────────────────────────────────────────
// One URL for the per-shop app/uninstalled subscription and the three
// mandatory compliance topics set in the Dev Dashboard. Signed with the
// client secret (X-Shopify-Hmac-Sha256, base64 over the raw body); a bad
// signature gets 401, as Shopify's review checks.
//
// POST /api/webhook/shopify
//
// The hub stores no customer data from Shopify (orders are read live and
// shown without names, emails or addresses), so customers/data_request and
// customers/redact have nothing to return or erase: they are acknowledged.

export async function POST(request: Request) {
  const secret = shopifySecret();
  if (!secret) return new Response("Not configured", { status: 503 });
  const raw = await request.text();
  if (!verifyShopifyWebhook(raw, request.headers.get("x-shopify-hmac-sha256"), secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const topic = request.headers.get("x-shopify-topic") ?? "";
  const shop = normalizeShop(request.headers.get("x-shopify-shop-domain"));
  try {
    if ((topic === "app/uninstalled" || topic === "shop/redact") && shop) {
      await forgetShopifyShop(shop);
      console.log(`[shopify] ${topic} ${shop}: store row removed`);
    } else {
      console.log(`[shopify] ${topic} ${shop ?? ""}: nothing stored, acknowledged`);
    }
  } catch (error) {
    // 500 makes Shopify retry; deleting twice is harmless.
    console.error("[shopify] webhook failed", topic, error);
    return new Response("Error", { status: 500 });
  }
  return new Response(null, { status: 200 });
}
