import { NextResponse } from "next/server";
import { and, desc, eq, isNotNull, ne, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/pool";
import { hubProject, hubReview, hubReviewsSource } from "@workspace/drizzle/schema";
import { cleanReviewText, writeReviewUrl } from "@workspace/trpc/lib/google-reviews-shared";

import { corsHeaders, isAllowedOrigin, parseProjectIdParam } from "@/lib/agency-public";

// ─── Google Reviews feed ────────────────────────────────────────
// Public endpoint behind public/reviews.js on clients' websites: the listing's
// rating and the newest visible 5-star reviews with text (isFeedReview) out of
// every review the Google Reviews app saved. Only the project's own domains (hub_project.origins + website URL) may
// read it, same check as the lead capture script.

const METHODS = "GET, OPTIONS";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(req.headers.get("origin"), METHODS),
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId: projectIdParam } = await params;
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin, METHODS);
  const notFound = () =>
    NextResponse.json({ error: "Unknown project" }, { status: 404, headers });

  const projectId = parseProjectIdParam(projectIdParam);
  if (projectId === null) return notFound();

  const [project] = await db
    .select({
      origins: hubProject.origins,
      websiteUrl: hubProject.websiteUrl,
      apps: hubProject.apps,
    })
    .from(hubProject)
    .where(eq(hubProject.id, projectId))
    .limit(1);
  if (!project || !project.apps.includes("google-reviews")) return notFound();
  if (!isAllowedOrigin(origin, project)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403, headers });
  }

  const source = await db.query.hubReviewsSource.findFirst({
    where: and(eq(hubReviewsSource.projectId, projectId), eq(hubReviewsSource.provider, "google")),
  });
  if (!source) return notFound();

  const requested = Number(new URL(req.url).searchParams.get("limit"));
  const limit = Number.isInteger(requested) && requested > 0 ? Math.min(requested, MAX_LIMIT) : DEFAULT_LIMIT;
  const reviews = await db
    .select()
    .from(hubReview)
    .where(
      and(
        eq(hubReview.projectId, projectId),
        eq(hubReview.provider, "google"),
        eq(hubReview.rating, 5),
        isNotNull(hubReview.text),
        ne(sql`trim(${hubReview.text})`, ""),
        eq(hubReview.hidden, false)
      )
    )
    .orderBy(desc(hubReview.publishedAt))
    .limit(limit);

  return NextResponse.json(
    {
      business: {
        name: source.businessName,
        rating: source.rating,
        totalReviews: source.totalReviews,
        writeReviewUrl: source.externalId ? writeReviewUrl(source.externalId) : null,
        mapsUrl: source.url,
      },
      reviews: reviews.map((r) => ({
        id: r.id,
        author: r.authorName,
        photo: r.authorPhotoUrl,
        rating: r.rating,
        // Rows saved before cleanReviewText existed may still hold <br> tags.
        text: cleanReviewText(r.text) ?? "",
        publishedAt: r.publishedAt.toISOString(),
        reply: cleanReviewText(r.ownerReply),
        url: r.reviewUrl,
      })),
    },
    { headers: { ...headers, "Cache-Control": "public, max-age=300" } }
  );
}
