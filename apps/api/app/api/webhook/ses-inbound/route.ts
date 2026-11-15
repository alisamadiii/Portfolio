import { handleInboundEmail, readInboundObject } from "@workspace/trpc/lib/inbound-email";
import { verifySnsMessage, type SnsMessage } from "@workspace/trpc/lib/inbound/sns";

export const maxDuration = 60;

// ─── SES inbound email (via SNS) ─────────────────────────────────
// Lead replies to Leads inbox emails: SES receives mail for
// INBOX_REPLY_DOMAIN, stores it in S3 and SNS posts here. The reply lands in
// the lead's thread (lib/inbound-email.ts).
//
// POST /api/webhook/ses-inbound

type SesReceived = {
  notificationType?: string;
  receipt?: {
    recipients?: string[];
    action?: { type?: string; bucketName?: string; objectKey?: string };
    spamVerdict?: { status?: string };
    virusVerdict?: { status?: string };
  };
};

export async function POST(request: Request) {
  const topicArn = process.env.INBOUND_SNS_TOPIC_ARN;
  if (!topicArn) {
    console.error("[ses-inbound] INBOUND_SNS_TOPIC_ARN is not set");
    return new Response("Not configured", { status: 503 });
  }

  let msg: SnsMessage;
  try {
    // SNS posts JSON with Content-Type text/plain.
    msg = JSON.parse(await request.text()) as SnsMessage;
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  if (!(await verifySnsMessage(msg, topicArn))) {
    return new Response("Invalid signature", { status: 401 });
  }

  if (msg.Type === "SubscriptionConfirmation") {
    // Verified + our topic, so the SubscribeURL is SNS's own.
    const res = await fetch(msg.SubscribeURL!, { signal: AbortSignal.timeout(10_000) });
    return new Response(res.ok ? "Subscribed" : "Confirm failed", { status: res.ok ? 200 : 502 });
  }
  if (msg.Type !== "Notification") return new Response(null, { status: 204 });

  let event: SesReceived;
  try {
    event = JSON.parse(msg.Message) as SesReceived;
  } catch {
    return new Response(null, { status: 204 });
  }
  const action = event.receipt?.action;
  if (event.notificationType !== "Received" || action?.type !== "S3" || !action.bucketName || !action.objectKey) {
    return new Response(null, { status: 204 });
  }
  if (event.receipt?.spamVerdict?.status === "FAIL" || event.receipt?.virusVerdict?.status === "FAIL") {
    console.warn("[ses-inbound] dropped spam/virus", action.objectKey);
    return new Response(null, { status: 204 });
  }

  try {
    const raw = await readInboundObject(action.bucketName, action.objectKey);
    const result = await handleInboundEmail(raw, event.receipt?.recipients ?? []);
    if (result.status === "ignored") console.warn("[ses-inbound] ignored", action.objectKey, result.reason);
    return Response.json(result);
  } catch (error) {
    // 500 makes SNS retry; handling is idempotent (Message-ID).
    console.error("[ses-inbound] failed", action.objectKey, error);
    return new Response("Error", { status: 500 });
  }
}
