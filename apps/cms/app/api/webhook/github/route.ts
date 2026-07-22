import { after } from "next/server";
import crypto from "crypto";
import { handleRepositoryWebhookEvent } from "@/lib/github-webhook-repository";
import { handlePushWebhookEvent } from "@/lib/github-webhook-push";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Handles GitHub org webhooks:
 * - Maintains collaborator rows on repo rename/delete/transfer
 * - Maintains GitHub file cache on push and branch deletion
 *
 * POST /api/webhook/github
 *
 * Requires the org webhook secret and signature.
 */
const processWebhookEvent = async (event: string | null, data: any) => {
  if (await handleRepositoryWebhookEvent(event, data)) return;
  if (await handlePushWebhookEvent(event, data)) return;
};

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("X-Hub-Signature-256");
    const event = request.headers.get("X-GitHub-Event");
    const body = await request.text();

    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
      console.error("Missing GITHUB_WEBHOOK_SECRET");
      return Response.json(null, { status: 500 });
    }

    const hmac = crypto.createHmac("sha256", secret);
    const digest = `sha256=${hmac.update(body).digest("hex")}`;
    if (!signature) {
      return Response.json(null, { status: 401 });
    }

    const signatureBuffer = Buffer.from(signature, "utf8");
    const digestBuffer = Buffer.from(digest, "utf8");
    if (
      signatureBuffer.length !== digestBuffer.length
      || !crypto.timingSafeEqual(signatureBuffer, digestBuffer)
    ) {
      return Response.json(null, { status: 401 });
    }

    const data = JSON.parse(body);

    after(async () => {
      try {
        await processWebhookEvent(event, data);
      } catch (error: any) {
        console.error("Error in Webhook", {
          error,
          event,
          payload: data,
          action: data?.action,
        });
      }
    });

    return Response.json(null, { status: 200 });
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return Response.json(null, { status: 500 });
  }
}
