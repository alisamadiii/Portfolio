import { handleMercuryTransactionEvent } from "@workspace/trpc/lib/partners";
import { verifyMercurySignature, type MercuryWebhookEvent } from "@workspace/trpc/lib/mercury-shared";

export const maxDuration = 30;

// ─── Mercury webhook ─────────────────────────────────────────────
// Partner payouts: Ali pays partners by ACH from Mercury by hand; Mercury
// posts transaction.created / transaction.updated here and the handler
// matches the transfer to the owed referral. The payload only identifies
// the transaction; it is re-read from the API.
//
// Register once (secret is returned only on creation -> MERCURY_WEBHOOK_SECRET):
//   POST https://api.mercury.com/api/v1/webhooks
//   { "url": "https://api.alisamadii.com/api/webhook/mercury",
//     "eventTypes": ["transaction.created", "transaction.updated"] }
//
// POST /api/webhook/mercury

export async function POST(request: Request) {
  const secret = process.env.MERCURY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[mercury] MERCURY_WEBHOOK_SECRET is not set");
    return new Response("Not configured", { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifyMercurySignature(rawBody, request.headers.get("mercury-signature"), secret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: MercuryWebhookEvent;
  try {
    event = JSON.parse(rawBody) as MercuryWebhookEvent;
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  if (!event || typeof event.resourceType !== "string") return new Response("Bad event", { status: 400 });

  // Balance events and the verify ping: acknowledge, nothing to do.
  if (event.resourceType !== "transaction" || typeof event.resourceId !== "string" || event.operationType === "delete") {
    return new Response(null, { status: 200 });
  }

  try {
    const result = await handleMercuryTransactionEvent(event.resourceId);
    if (result.matched) console.log("[mercury] payout recorded", result);
  } catch (error) {
    // 500 makes Mercury retry (10 tries over a day); the handler is safe to run twice.
    console.error("[mercury] event failed", event.id, error);
    return new Response("Error", { status: 500 });
  }
  return new Response(null, { status: 200 });
}
