import { handleTelnyxEvent, type TelnyxEvent } from "@workspace/trpc/lib/inbox";
import { verifyTelnyxSignature } from "@workspace/trpc/lib/telnyx/signature";

export const maxDuration = 60;

// ─── Telnyx messaging webhook ────────────────────────────────────
// Every project's messaging profile posts here: replies to a project's number
// land in its Leads inbox, delivery receipts update sent texts.
//
// POST /api/webhook/telnyx

export async function POST(request: Request) {
  const publicKey = process.env.TELNYX_PUBLIC_KEY;
  if (!publicKey) {
    console.error("[telnyx] TELNYX_PUBLIC_KEY is not set");
    return new Response("Not configured", { status: 503 });
  }

  const rawBody = await request.text();
  const ok = verifyTelnyxSignature({
    rawBody,
    signature: request.headers.get("telnyx-signature-ed25519"),
    timestamp: request.headers.get("telnyx-timestamp"),
    publicKey,
  });
  if (!ok) return new Response("Invalid signature", { status: 401 });

  let event: TelnyxEvent;
  try {
    event = JSON.parse(rawBody) as TelnyxEvent;
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  try {
    await handleTelnyxEvent(event);
  } catch (error) {
    // 500 makes Telnyx retry; the handler is safe to run twice.
    console.error("[telnyx] event failed", event.data?.event_type, error);
    return new Response("Error", { status: 500 });
  }
  return new Response(null, { status: 204 });
}
