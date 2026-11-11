// POST /api/checkout: current cart → Wix checkout → 303 to the Wix-hosted
// checkout page. Wix handles payment, taxes, shipping and the order record.
// Callbacks bring the customer back to /shop/thank-you on this site.
import type { APIRoute } from "astro";
import { checkoutUrl, visitorToken } from "../../lib/wix";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, url, redirect }) => {
  const token = await visitorToken(cookies, false);
  if (!token) return redirect("/cart?error=empty", 303);
  try {
    return redirect(await checkoutUrl(token, url.origin), 303);
  } catch (e) {
    console.error("[wix] checkout failed", e);
    return redirect("/cart?error=checkout", 303);
  }
};
