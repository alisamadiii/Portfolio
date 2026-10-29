/**
 * One-time cutover helper (repoId -> projectId). Migration 0038 rewrote each
 * subscription row's metadata to { projectId: <hub_project.id> }; this pushes
 * the same key to the Stripe subscriptions themselves (projectId set, repoId
 * removed), so future webhooks and checkouts carry the uuid. Idempotent.
 *
 * Run from the repo root:
 *   npx tsx packages/trpc/scripts/backfill-stripe-project-id.mts            # dry run
 *   npx tsx packages/trpc/scripts/backfill-stripe-project-id.mts --commit   # real run
 */

import * as path from "path";
import * as dotenv from "dotenv";
import { like, sql } from "drizzle-orm";
import Stripe from "stripe";

dotenv.config({ path: path.resolve(process.cwd(), "apps/api/.env") });

const COMMIT = process.argv.includes("--commit");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const { db } = await import("@workspace/drizzle/index");
const { subscriptions } = await import("@workspace/drizzle/schema");

console.log(
  `Stripe projectId backfill ${COMMIT ? "(COMMIT)" : "(dry run)"} | DB: ${new URL(process.env.DATABASE_URL!).host} | Stripe: ${process.env.STRIPE_SECRET_KEY!.includes("_live_") ? "LIVE" : "test"}\n`
);

const rows = await db
  .select({
    id: subscriptions.id,
    projectId: sql<string | null>`${subscriptions.metadata} ->> 'projectId'`,
  })
  .from(subscriptions)
  .where(like(subscriptions.id, "sub_%"));

let changed = 0;
for (const row of rows) {
  if (!row.projectId) continue;
  const sub = await stripe.subscriptions.retrieve(row.id).catch(() => null);
  if (!sub) {
    console.log(`  ! ${row.id} not found in Stripe`);
    continue;
  }
  if (sub.metadata.projectId === row.projectId && !sub.metadata.repoId) continue;
  console.log(
    `  ${row.id}: repoId=${sub.metadata.repoId ?? "-"} projectId=${sub.metadata.projectId ?? "-"} -> projectId=${row.projectId}`
  );
  changed++;
  if (COMMIT) {
    // An empty string deletes a metadata key in Stripe.
    await stripe.subscriptions.update(row.id, {
      metadata: { projectId: row.projectId, repoId: "", repo_id: "" },
    });
  }
}

console.log(`\n${changed} subscription(s) ${COMMIT ? "updated" : "would be updated"}.`);
process.exit(0);
