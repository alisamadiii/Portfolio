import { NextResponse, type NextRequest } from "next/server";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/pool";
import { hubProject, hubUberStore } from "@workspace/drizzle/schema";
import { sweepDoorDashProvisions } from "@workspace/trpc/lib/doordash";
import { mapLimit } from "@workspace/trpc/lib/places";
import {
  isUberEatsConfigured,
  reconcileUberStore,
  sweepUberProvisions,
} from "@workspace/trpc/lib/uber-eats";

export const maxDuration = 300;

/**
 * Hourly Uber Eats reconcile: re-reads every connected store (details, online
 * status) and its still-open orders from the last two days, so a missed
 * webhook can't leave the dashboard stale. Triggered by a Coolify scheduled
 * task on the api service:
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
  if (!isUberEatsConfigured()) {
    return NextResponse.json({ error: "UBER_EATS_CLIENT_ID / SECRET are not set" }, { status: 503 });
  }

  const only = request.nextUrl.searchParams.get("projectId");
  const stores = await db
    .select({ id: hubUberStore.id, projectId: hubUberStore.projectId, storeId: hubUberStore.storeId })
    .from(hubUberStore)
    .innerJoin(hubProject, eq(hubProject.id, hubUberStore.projectId))
    .where(
      and(
        sql`'uber-eats' = any(${hubProject.apps})`,
        only ? eq(hubUberStore.projectId, only) : undefined
      )
    );

  const results = await mapLimit(stores, 3, async (store) => ({
    projectId: store.projectId,
    result: await reconcileUberStore(store),
  }));
  await sweepUberProvisions();
  // DoorDash has no cron of its own yet; its unfinished store picks are swept here.
  await sweepDoorDashProvisions();

  return NextResponse.json({
    stores: results.length,
    synced: results.filter((r) => r.result.ok).length,
    ordersUpdated: results.reduce((n, r) => n + r.result.updated, 0),
    failed: results.filter((r) => !r.result.ok).map((r) => r.projectId),
  });
}
