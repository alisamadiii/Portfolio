// Cart mutations for the shop. JSON in, cart summary out. The visitor identity
// lives in the httpOnly wix_session cookie, so the browser never sees tokens.
//   { action: "add", productId, variantId, quantity? }
//   { action: "update", lineId, quantity }
//   { action: "remove", lineId }
import type { APIRoute } from "astro";
import { addToCart, getCart, removeLine, updateLineQuantity, visitorToken, type Cart } from "../../lib/wix";

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const GET: APIRoute = async ({ cookies }) => {
  const token = await visitorToken(cookies, false);
  const cart = token ? await getCart(token) : undefined;
  return json(200, { count: cart?.count ?? 0 });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: Record<string, string | number>;
  try {
    body = (await request.json()) as Record<string, string | number>;
  } catch {
    return json(400, { error: "Bad JSON" });
  }
  try {
    const token = await visitorToken(cookies);
    if (!token) return json(500, { error: "No visitor session" });
    let cart: Cart;
    const qty = Math.max(0, Math.min(99, Number(body.quantity ?? 1)));
    switch (body.action) {
      case "add":
        if (!body.productId || !body.variantId) return json(400, { error: "productId and variantId required" });
        cart = await addToCart(token, String(body.productId), String(body.variantId), qty || 1);
        break;
      case "update":
        cart = qty === 0 ? await removeLine(token, String(body.lineId)) : await updateLineQuantity(token, String(body.lineId), qty);
        break;
      case "remove":
        cart = await removeLine(token, String(body.lineId));
        break;
      default:
        return json(400, { error: "Unknown action" });
    }
    return json(200, { ok: true, count: cart.count, subtotal: cart.subtotal, lines: cart.lines });
  } catch (e) {
    console.error("[wix] cart failed", e);
    return json(502, { error: "Cart update failed. Try again." });
  }
};
