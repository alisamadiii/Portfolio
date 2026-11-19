import { applyOnboardingEvent } from "@workspace/trpc/lib/doordash";
import { verifyDoorDashWebhookToken, type DoorDashOnboardingEvent } from "@workspace/trpc/lib/doordash-shared";

export const maxDuration = 60;

// ─── DoorDash onboarding status webhook ─────────────────────────
// Subscribed in the Developer Portal (one endpoint per environment) with
// DOORDASH_WEBHOOK_TOKEN as its auth token. Each call is one onboarding job's
// new status; the handler finds the store and saves it.
//
// POST /api/webhook/doordash

export async function POST(request: Request) {
  const token = process.env.DOORDASH_WEBHOOK_TOKEN;
  if (!token) {
    console.error("[doordash] DOORDASH_WEBHOOK_TOKEN is not set");
    return new Response("Not configured", { status: 503 });
  }
  if (!verifyDoorDashWebhookToken(request.headers, token)) {
    // Header names only, to learn which one DoorDash uses for the token.
    console.warn("[doordash] webhook auth failed; headers:", [...request.headers.keys()].join(","));
    return new Response("Unauthorized", { status: 401 });
  }

  let body: DoorDashOnboardingEvent & { data?: DoorDashOnboardingEvent };
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  const event = body?.onboarding_id ? body : body?.data;
  if (!event || typeof event.onboarding_id !== "string") return new Response("Bad event", { status: 400 });

  try {
    await applyOnboardingEvent(event);
  } catch (error) {
    // 500 makes DoorDash retry (3 tries); the handler is safe to run twice.
    console.error("[doordash] event failed", event.onboarding_id, error);
    return new Response("Error", { status: 500 });
  }
  return new Response(null, { status: 200 });
}
