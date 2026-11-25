import { handleMercuryTransactionEvent } from "@workspace/trpc/lib/partners";
import { verifyMercurySignature, type MercuryWebhookEvent } from "@workspace/trpc/lib/mercury-shared";

export const maxDuration = 30;

// ─── Mercury webhook ─────────────────────────────────────────────
// Partner payouts: Ali pays partners by ACH from Mercury by hand; Mercury
// posts transaction.created / transaction.updated here and the handler
// matches the transfer to the owed referral. The payload only identifies
// the transaction; it is re-read from the API.
//
// Created once in the Mercury dashboard (Settings -> Webhooks) with
// transaction.created + transaction.updated; the secret shown on creation
// goes to MERCURY_WEBHOOK_SECRET on the api service.
//
// POST /api/webhook/mercury

export async function POST(request: Request) {
  const rawBody = await request.text();

  // Mercury verifies the URL before it hands out the signing secret, so with
  // no secret configured we acknowledge and ignore. Nothing is processed
  // until MERCURY_WEBHOOK_SECRET is set; events in that window are lost
  // (admin can still record the payout by hand).
  const secret = process.env.MERCURY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[mercury] MERCURY_WEBHOOK_SECRET is not set; event ignored", rawBody.slice(0, 200));
    return new Response(null, { status: 200 });
  }

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
