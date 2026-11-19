import { handleGrubhubWebhook, isGrubhubWebhookConfigured } from "@workspace/trpc/lib/grubhub";
import { verifyBasicAuth } from "@workspace/trpc/lib/grubhub-shared";

export const maxDuration = 60;

// ─── Grubhub webhook ─────────────────────────────────────────────
// The agency's one webhook URL, registered by the Grubhub team with the Basic
// credentials from GRUBHUB_WEBHOOK_USER / PASSWORD. Every webhook type lands
// here (order status, merchant availability, activation, menu ingestion …);
// the body's shape says which. Order webhooks carry the whole order.
//
// POST /api/webhook/grubhub
//
// Answer 200 fast: Grubhub retries about once a minute on a 5xx or a timeout
// until the order goes stale (8 to 12 minutes), and never on a 4xx.

export async function POST(request: Request) {
  if (!isGrubhubWebhookConfigured()) {
    console.error("[grubhub] GRUBHUB_WEBHOOK_USER / PASSWORD are not set");
    return new Response("Not configured", { status: 503 });
  }
  if (
    !verifyBasicAuth(
      request.headers.get("authorization"),
      process.env.GRUBHUB_WEBHOOK_USER ?? "",
      process.env.GRUBHUB_WEBHOOK_PASSWORD ?? ""
    )
  ) {
    return new Response("Unauthorized", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="grubhub"' } });
  }

  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  if (!body || typeof body !== "object") return new Response("Bad event", { status: 400 });

  try {
    const result = await handleGrubhubWebhook(body);
    console.log(
      `[grubhub] webhook ${result.kind} ${result.id ?? ""} ${result.handled ? "handled" : `ignored: ${"reason" in result ? result.reason : ""}`}`.trim()
    );
  } catch (error) {
    // 500 makes Grubhub retry; the handler is safe to run twice.
    console.error("[grubhub] webhook failed", error);
    return new Response("Error", { status: 500 });
  }
  return new Response(null, { status: 200 });
}
