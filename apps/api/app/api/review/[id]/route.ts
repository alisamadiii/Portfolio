import { createElement } from "react";
import { NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";

import { db } from "@workspace/drizzle/pool";
import {
  agencyClient,
  hubProject,
  hubReviewFeedback,
  hubReviewLink,
} from "@workspace/drizzle/schema";
import { email } from "@workspace/email";
import ReviewFeedbackEmail from "@workspace/email/emails/review-feedback";
import { planAllowsApp } from "@workspace/trpc/lib/apps";
import { MAX_BODY_BYTES, tooFast } from "@workspace/trpc/lib/agency/lead-capture";
import { senderDisplayName } from "@workspace/trpc/lib/inbox-shared";
import { getEntitlement } from "@workspace/trpc/lib/payment/entitlements";
import { publicObjectUrl } from "@workspace/trpc/lib/r2";
import {
  PRIVATE_MAX_RATING,
  isReviewSlug,
  reviewBusiness,
} from "@workspace/trpc/lib/review-link-shared";
import { urls } from "@workspace/ui/lib/company";

import {
  clientIp,
  corsHeaders,
  findContactClientByProjectId,
  isRateLimited,
} from "@/lib/agency-public";

// ─── Feedback app: public review link ───────────────────────────
// www.alisamadii.com/review/<id> (apps/agency) reads the business here and
// posts ratings back. GET = the business details the page shows (whitelisted
// fields from Business info, Google place as fallback). POST = record or
// update one visitor's rating:
//   { rating, message }              → private feedback (1 to 4), emails the owner
//   { rating, google: true }         → the visitor opened the Google review
// Star taps alone are never saved. Both return { feedbackId }; a later post
// with it updates the same row, for an hour after it was created.

const EDIT_WINDOW_MS = 60 * 60 * 1000;
// One visit is up to ~3 posts (tap, change, submit); allow a couple of visits.
const RATE_LIMIT = 10;

const notFound = (headers: HeadersInit) =>
  NextResponse.json({ error: "Not found" }, { status: 404, headers });

/** The link + its project, or null when unknown or the plan no longer has the app. */
async function resolveLink(id: string) {
  if (!isReviewSlug(id)) return null;
  const [row] = await db
    .select({
      link: hubReviewLink,
      logoKey: hubProject.logoKey,
      websiteUrl: hubProject.websiteUrl,
      businessInfo: agencyClient.businessInfo,
    })
    .from(hubReviewLink)
    .innerJoin(hubProject, eq(hubProject.id, hubReviewLink.projectId))
    .leftJoin(agencyClient, eq(agencyClient.projectId, hubReviewLink.projectId))
    .where(eq(hubReviewLink.id, id))
    .limit(1);
  // Not live until the Business Profile review link is pasted.
  if (!row?.link.googleReviewUrl) return null;
  const entitlement = await getEntitlement(row.link.projectId);
  if (!planAllowsApp("feedback", entitlement)) return null;
  return row;
}

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(req.headers.get("origin"), "GET, POST, OPTIONS"),
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const headers = corsHeaders(req.headers.get("origin"), "GET, POST, OPTIONS");
  const row = await resolveLink(id);
  if (!row) return notFound(headers);

  return NextResponse.json(
    {
      ...reviewBusiness(row.businessInfo, row.link),
      logoUrl: publicObjectUrl(row.logoKey),
      websiteUrl: row.websiteUrl,
      googleUrl: row.link.googleReviewUrl,
    },
    { headers: { ...headers, "Cache-Control": "public, max-age=60" } }
  );
}

const text = (max: number) =>
  z
    .string()
    .max(max)
    .transform((v) => v.trim() || null)
    .optional();

const bodySchema = z.object({
  feedbackId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  message: text(5000),
  name: text(200),
  contact: text(200),
  google: z.boolean().optional(),
  // Honeypot + time-to-submit, same shape as the embed scripts.
  hp: z.string().max(500).optional(),
  t: z.number().int().nonnegative().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const headers = corsHeaders(req.headers.get("origin"), "GET, POST, OPTIONS");

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Too large" }, { status: 413, headers });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400, headers });
  }
  const data = parsed.data;

  const row = await resolveLink(id);
  if (!row) return notFound(headers);
  const { link } = row;

  if (await isRateLimited(`review:${id}:${clientIp(req)}`, RATE_LIMIT)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a few minutes." },
      { status: 429, headers }
    );
  }

  // Bots: quiet success, nothing stored.
  if (data.hp || (data.message && tooFast(data.t))) {
    return NextResponse.json({ ok: true, feedbackId: data.feedbackId ?? null }, { headers });
  }

  // A sent form or a Google click creates the visitor's row; later posts
  // update their own recent row.
  let existing: typeof hubReviewFeedback.$inferSelect | undefined;
  if (data.feedbackId) {
    [existing] = await db
      .select()
      .from(hubReviewFeedback)
      .where(
        and(
          eq(hubReviewFeedback.id, data.feedbackId),
          eq(hubReviewFeedback.linkId, link.id),
          gt(hubReviewFeedback.createdAt, new Date(Date.now() - EDIT_WINDOW_MS))
        )
      )
      .limit(1);
    if (!existing) return notFound(headers);
  } else {
    if (!data.rating) {
      return NextResponse.json({ error: "Pick a rating" }, { status: 400, headers });
    }
    if (!data.google && !(data.message && data.rating <= PRIVATE_MAX_RATING)) {
      return NextResponse.json(
        { error: "Write your feedback or open Google to post a review" },
        { status: 400, headers }
      );
    }
    [existing] = await db
      .insert(hubReviewFeedback)
      .values({ projectId: link.projectId, linkId: link.id, rating: data.rating })
      .returning();
  }
  if (!existing) {
    return NextResponse.json({ error: "Could not save" }, { status: 500, headers });
  }

  const rating = data.rating ?? existing.rating;
  const isNewFeedback =
    !!data.message && !existing.message && rating <= PRIVATE_MAX_RATING;

  await db
    .update(hubReviewFeedback)
    .set({
      rating,
      ...(data.google ? { wentToGoogle: true } : {}),
      ...(data.message && rating <= PRIVATE_MAX_RATING
        ? { message: data.message, name: data.name ?? null, contact: data.contact ?? null }
        : {}),
    })
    .where(eq(hubReviewFeedback.id, existing.id));

  if (isNewFeedback) {
    // The owner hears about private feedback right away. A failed send never
    // fails the visitor's submit: the feedback is already saved in the hub.
    const target = await findContactClientByProjectId(link.projectId);
    const to = target?.notifyEmail ?? target?.ownerEmail;
    if (to) {
      const business = reviewBusiness(row.businessInfo, link);
      const result = await email.send({
        from: `"${senderDisplayName(`${business.name} feedback`)}" <noreply@alisamadii.com>`,
        to,
        subject: `${rating}-star feedback for ${business.name}`.replace(/[\r\n]+/g, " "),
        react: createElement(ReviewFeedbackEmail, {
          businessName: business.name,
          rating,
          message: data.message!,
          name: data.name ?? null,
          contact: data.contact ?? null,
          hubUrl: `${urls.cms}/p/${link.projectId}/feedback`,
        }),
      });
      if (result.error) console.error("[review] feedback email failed", result.error);
    }
  }

  return NextResponse.json({ ok: true, feedbackId: existing.id }, { headers });
}
