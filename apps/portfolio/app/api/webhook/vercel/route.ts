import crypto from "crypto";
import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { hubProject, webhookEvents } from "@workspace/drizzle/schema";
import { syncDomainsForRepo } from "@workspace/trpc/lib/vercel/domains";

export const maxDuration = 60;

/**
 * Handles Vercel team webhooks for project domain changes.
 *
 * POST /api/webhook/vercel
 *
 * State-sync pattern (same as the Stripe webhook): the payload delta is never
 * trusted — any project.domain.* event resolves the repo from the Vercel
 * project id and re-fetches that project's full domain list into cms_domain.
 *
 * Setup (Vercel Pro): Team Settings → Webhooks → Create Webhook
 * - URL: https://<portfolio production domain>/api/webhook/vercel
 * - Events: project.domain.created / .deleted / .updated / .verified /
 *   .unverified / .moved
 * - Secret → VERCEL_WEBHOOK_SECRET
 */
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-vercel-signature");

    const secret = process.env.VERCEL_WEBHOOK_SECRET;
    if (!secret) {
      console.error("Missing VERCEL_WEBHOOK_SECRET");
      return Response.json(null, { status: 500 });
    }
    if (!signature) {
      return Response.json(null, { status: 401 });
    }

    // Vercel signs the raw body with HMAC-SHA1 (hex) using the webhook secret.
    const digest = crypto
      .createHmac("sha1", secret)
      .update(body)
      .digest("hex");
    const signatureBuffer = Buffer.from(signature, "utf8");
    const digestBuffer = Buffer.from(digest, "utf8");
    if (
      signatureBuffer.length !== digestBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, digestBuffer)
    ) {
      return Response.json(null, { status: 401 });
    }

    const event = JSON.parse(body) as {
      id?: string;
      type?: string;
      createdAt?: number;
      payload?: { project?: { id?: string } };
    };

    // Audit log, mirroring the Stripe/Polar webhookEvents parity.
    try {
      await db.insert(webhookEvents).values({
        timestamp: event.createdAt ? new Date(event.createdAt) : new Date(),
        type: event.type ?? "unknown",
        payload: event.payload ?? {},
      });
    } catch (error) {
      console.error("Failed to log Vercel webhook event", error);
    }

    if (!event.type?.startsWith("project.domain.")) {
      return Response.json({ received: true });
    }

    const projectId = event.payload?.project?.id;
    if (!projectId) {
      return Response.json({ received: true });
    }

    after(async () => {
      try {
        // Only projects already discovered (vercelProjectId cached) are
        // tracked; anything else is picked up on that repo's next list/refresh.
        const [row] = await db
          .select({ repoId: hubProject.repoId })
          .from(hubProject)
          .where(eq(hubProject.vercelProjectId, projectId))
          .limit(1);
        if (!row) return;

        await syncDomainsForRepo(row.repoId);
        revalidateTag("website-status", { expire: 0 });
      } catch (error) {
        console.error("Vercel domain sync failed", { error, projectId });
      }
    });

    return Response.json({ received: true });
  } catch (error) {
    console.error("Error processing Vercel webhook:", error);
    return Response.json(null, { status: 500 });
  }
}
