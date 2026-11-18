import { NextResponse, type NextRequest } from "next/server";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/pool";
import { hubProject, hubReviewsSource } from "@workspace/drizzle/schema";
import { isApifyConfigured, syncGoogleReviews } from "@workspace/trpc/lib/google-reviews";
import { mapLimit } from "@workspace/trpc/lib/places";

// Each project's scrape can take a minute or two; keep the request open.
export const maxDuration = 900;

/**
 * Daily Google Reviews sync: re-scrapes every connected listing whose project
 * still has the Google Reviews app installed and adds new 5-star reviews.
 * Triggered by a Coolify scheduled task on the api service:
 *   curl -fsS -H "Authorization: Bearer $INTERNAL_API_SECRET" http://localhost:3000/api/cron/google-reviews
 * `?projectId=…` limits the run to one project (manual testing).
 * Uses the existing server-to-server INTERNAL_API_SECRET, never
 * BETTER_AUTH_SECRET (that one signs login sessions).
 */
export async function GET(request: NextRequest) {
  if (
    !process.env.INTERNAL_API_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.INTERNAL_API_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isApifyConfigured()) {
    return NextResponse.json({ error: "APIFY_TOKEN is not set" }, { status: 503 });
  }

  const only = request.nextUrl.searchParams.get("projectId");
  const sources = await db
    .select({ projectId: hubReviewsSource.projectId })
    .from(hubReviewsSource)
    .innerJoin(hubProject, eq(hubProject.id, hubReviewsSource.projectId))
    .where(
      and(
        eq(hubReviewsSource.provider, "google"),
        sql`'google-reviews' = any(${hubProject.apps})`,
        only ? eq(hubReviewsSource.projectId, only) : undefined
      )
    );

  const results = await mapLimit(sources, 3, async ({ projectId }) => ({
    projectId,
    result: await syncGoogleReviews(projectId),
  }));

  return NextResponse.json({
    synced: results.filter((r) => r.result.ok).length,
    added: results.reduce((n, r) => n + (r.result.ok ? r.result.added : 0), 0),
    failed: results.filter((r) => !r.result.ok).map((r) => r.projectId),
  });
}
