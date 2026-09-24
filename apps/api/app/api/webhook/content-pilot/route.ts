import crypto from "crypto";
import { after } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { hubProject, user } from "@workspace/drizzle/schema";
import { email } from "@workspace/email";
import AiEditFailedEmail from "@workspace/email/emails/ai-edit-failed";

export const maxDuration = 60;

type WebhookPayload = {
  jobId: number;
  repoId: number;
  owner: string;
  repo: string;
  branch: string;
  prompt: string;
  status: "done" | "rejected" | "failed";
  error: string | null;
  resultSummary: string | null;
  commitSha: string | null;
  requestedBy: string | null;
  finishedAt: string | null;
};

/**
 * Emails the project owner when an AI edit (from content-pilot) is rejected or
 * failed. content-pilot POSTs a signed payload here on terminal job states; the
 * signature is an HMAC-SHA256 of the raw body with a shared secret.
 *
 * POST /api/webhook/content-pilot
 */
const notifyRejectedOrFailed = async (payload: WebhookPayload) => {
  if (payload.status !== "rejected" && payload.status !== "failed") {
    return;
  }

  const [project] = await db
    .select({
      ownerUserId: hubProject.githubConnectedUserId,
      owner: hubProject.owner,
      repo: hubProject.repo,
    })
    .from(hubProject)
    .where(eq(hubProject.repoId, payload.repoId))
    .limit(1);

  if (!project?.ownerUserId) {
    console.warn(
      `[content-pilot webhook] no project/owner for repoId ${payload.repoId}`
    );
    return;
  }

  const [owner] = await db
    .select({ email: user.email, name: user.name })
    .from(user)
    .where(eq(user.id, project.ownerUserId))
    .limit(1);

  if (!owner?.email) {
    console.warn(
      `[content-pilot webhook] no email for user ${project.ownerUserId}`
    );
    return;
  }

  const { error } = await email.send({
    to: owner.email,
    subject: "Your AI edit couldn't be applied",
    react: AiEditFailedEmail({
      recipientName: owner.name,
      owner: project.owner,
      repo: project.repo,
      prompt: payload.prompt ?? undefined,
      error: payload.error ?? undefined,
      status: payload.status,
      jobId: payload.jobId,
    }),
  });
  if (error) {
    console.error(`[content-pilot webhook] email failed: ${error}`);
  }
};

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-content-pilot-signature");
    const body = await request.text();

    const secret = process.env.CONTENT_PILOT_WEBHOOK_SECRET;
    if (!secret) {
      console.error("Missing CONTENT_PILOT_WEBHOOK_SECRET");
      return Response.json(null, { status: 500 });
    }

    if (!signature) {
      return Response.json(null, { status: 401 });
    }

    const digest = `sha256=${crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex")}`;
    const signatureBuffer = Buffer.from(signature, "utf8");
    const digestBuffer = Buffer.from(digest, "utf8");
    if (
      signatureBuffer.length !== digestBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, digestBuffer)
    ) {
      return Response.json(null, { status: 401 });
    }

    const payload = JSON.parse(body) as WebhookPayload;

    after(async () => {
      try {
        await notifyRejectedOrFailed(payload);
      } catch (error) {
        console.error("[content-pilot webhook] processing error:", error);
      }
    });

    return Response.json(null, { status: 200 });
  } catch (error) {
    console.error("[content-pilot webhook] error:", error);
    return Response.json(null, { status: 500 });
  }
}
