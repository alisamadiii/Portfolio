import { handleUberEvent } from "@workspace/trpc/lib/uber-eats";
import { verifyUberSignature, type UberEvent } from "@workspace/trpc/lib/uber-eats-shared";

export const maxDuration = 60;

// ─── Uber Eats webhook ───────────────────────────────────────────
// The agency app's one webhook URL: every connected store's events land here
// (orders.notification, orders.status_changed, store.provisioned, …). The
// payload only carries ids; the handler re-reads the order from Uber.
//
// POST /api/webhook/uber-eats

export async function POST(request: Request) {
  const secret = process.env.UBER_EATS_CLIENT_SECRET;
  if (!secret) {
    console.error("[uber-eats] UBER_EATS_CLIENT_SECRET is not set");
    return new Response("Not configured", { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifyUberSignature(rawBody, request.headers.get("x-uber-signature"), secret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: UberEvent;
  try {
    event = JSON.parse(rawBody) as UberEvent;
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  if (!event || typeof event.event_type !== "string") return new Response("Bad event", { status: 400 });

  try {
    await handleUberEvent(event);
  } catch (error) {
    // 500 makes Uber retry (7 tries, backing off); the handler is safe to run twice.
    console.error("[uber-eats] event failed", event.event_type, error);
    return new Response("Error", { status: 500 });
  }
  // Uber wants a 200 with an empty body.
  return new Response(null, { status: 200 });
}
