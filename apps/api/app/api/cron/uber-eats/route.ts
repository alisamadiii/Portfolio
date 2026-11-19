import { NextResponse, type NextRequest } from "next/server";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/pool";
import { hubGrubhubStore, hubProject, hubUberStore } from "@workspace/drizzle/schema";
import { sweepDoorDashProvisions } from "@workspace/trpc/lib/doordash";
import { isGrubhubConfigured, reconcileGrubhubStore } from "@workspace/trpc/lib/grubhub";
import { mapLimit } from "@workspace/trpc/lib/places";
import {
  isUberEatsConfigured,
  reconcileUberStore,
  sweepUberProvisions,
} from "@workspace/trpc/lib/uber-eats";

export const maxDuration = 300;

/**
 * Hourly food-delivery reconcile (the path keeps its Uber Eats name so the
 * Coolify task needn't change). Uber Eats: re-reads every connected store and
 * its still-open orders from the last two days. Grubhub: re-reads every linked
 * merchant and pulls the last day's open orders. Either way a missed webhook
 * can't leave the dashboard stale. Triggered by a Coolify scheduled task on
 * the api service:
 *   curl -fsS -H "Authorization: Bearer $INTERNAL_API_SECRET" http://localhost:3000/api/cron/uber-eats
 * `?projectId=…` limits the run to one project (manual testing).
 */
export async function GET(request: NextRequest) {
  if (
    !process.env.INTERNAL_API_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.INTERNAL_API_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const uber = isUberEatsConfigured();
  const grubhub = isGrubhubConfigured();
  if (!uber && !grubhub) {
    return NextResponse.json({ error: "No food-delivery app is configured (UBER_EATS_* / GRUBHUB_*)" }, { status: 503 });
  }

  const only = request.nextUrl.searchParams.get("projectId");

  const uberResults = uber
    ? await mapLimit(
        await db
          .select({ id: hubUberStore.id, projectId: hubUberStore.projectId, storeId: hubUberStore.storeId })
          .from(hubUberStore)
          .innerJoin(hubProject, eq(hubProject.id, hubUberStore.projectId))
          .where(and(sql`'uber-eats' = any(${hubProject.apps})`, only ? eq(hubUberStore.projectId, only) : undefined)),
        3,
        async (store) => ({ projectId: store.projectId, result: await reconcileUberStore(store) })
      )
    : [];

  const grubhubResults = grubhub
    ? await mapLimit(
        await db
          .select({
            id: hubGrubhubStore.id,
            projectId: hubGrubhubStore.projectId,
            merchantId: hubGrubhubStore.merchantId,
            timezone: hubGrubhubStore.timezone,
            closedToday: hubGrubhubStore.closedToday,
            closedTodayAt: hubGrubhubStore.closedTodayAt,
          })
          .from(hubGrubhubStore)
          .innerJoin(hubProject, eq(hubProject.id, hubGrubhubStore.projectId))
          .where(and(sql`'grubhub' = any(${hubProject.apps})`, only ? eq(hubGrubhubStore.projectId, only) : undefined)),
        3,
        async (store) => ({ projectId: store.projectId, result: await reconcileGrubhubStore(store) })
      )
    : [];

  await sweepUberProvisions();
  // DoorDash has no cron of its own yet; its unfinished store picks are swept here.
  await sweepDoorDashProvisions();

  return NextResponse.json({
    stores: uberResults.length,
    synced: uberResults.filter((r) => r.result.ok).length,
    ordersUpdated: uberResults.reduce((n, r) => n + r.result.updated, 0),
    failed: uberResults.filter((r) => !r.result.ok).map((r) => r.projectId),
    grubhub: {
      stores: grubhubResults.length,
      synced: grubhubResults.filter((r) => r.result.ok).length,
      ordersUpdated: grubhubResults.reduce((n, r) => n + r.result.updated, 0),
      failed: grubhubResults.filter((r) => !r.result.ok).map((r) => r.projectId),
    },
  });
}
