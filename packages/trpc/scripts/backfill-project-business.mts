/**
 * One-time backfill for the business columns on hub_project (migration
 * 0070): name, phone, address, hours, google_place_id. (The hub_review_link
 * source was dropped with the Feedback app, migration 0078.)
 * Copies them from where they used to live, filling EMPTY columns only:
 *   - agency_client.business_info (website = business name, businessPhone,
 *     businessAddress, businessHours)
 *   - hub_reviews_source provider google (external_id, business_name)
 * Safe to run twice. Never deletes the legacy values.
 *
 * Logs projects whose Settings name differs from the Business info name so
 * they can be checked by hand (the Settings name wins).
 *
 * Run from the repo root, after `pnpm db:migrate`:
 *   npx tsx packages/trpc/scripts/backfill-project-business.mts            # dry run
 *   npx tsx packages/trpc/scripts/backfill-project-business.mts --commit   # real run
 */

import * as path from "path";
import * as dotenv from "dotenv";
import { and, eq } from "drizzle-orm";

dotenv.config({ path: path.resolve(process.cwd(), "apps/api/.env") });

const COMMIT = process.argv.includes("--commit");
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const { db } = await import("@workspace/drizzle/index");
const { agencyClient, hubProject, hubReviewsSource } = await import(
  "@workspace/drizzle/schema"
);

console.log(
  `Backfill project business ${COMMIT ? "(COMMIT)" : "(dry run)"} | db: ${new URL(process.env.DATABASE_URL).host}\n`
);

const first = (values: string[] | undefined) => values?.find((v) => v?.trim())?.trim() || null;
const clean = (value: string | null | undefined) => value?.trim() || null;

const rows = await db
  .select({
    id: hubProject.id,
    repo: hubProject.repo,
    name: hubProject.name,
    phone: hubProject.phone,
    address: hubProject.address,
    hours: hubProject.hours,
    googlePlaceId: hubProject.googlePlaceId,
    googleReviewUrl: hubProject.googleReviewUrl,
    businessInfo: agencyClient.businessInfo,
    sourcePlaceId: hubReviewsSource.externalId,
    sourceName: hubReviewsSource.businessName,
  })
  .from(hubProject)
  .leftJoin(agencyClient, eq(agencyClient.projectId, hubProject.id))
  .leftJoin(
    hubReviewsSource,
    and(eq(hubReviewsSource.projectId, hubProject.id), eq(hubReviewsSource.provider, "google"))
  )
  .where(eq(hubProject.hidden, false));

let changed = 0;
for (const row of rows) {
  const info = row.businessInfo ?? {};
  const infoName = first(info.website);
  const patch: Record<string, string> = {};

  const name = clean(row.name) ?? infoName ?? clean(row.sourceName);
  if (!row.name && name) patch.name = name;
  if (row.name && infoName && row.name.trim() !== infoName) {
    console.log(`  CHECK ${row.id} (${row.repo}): Settings name "${row.name}" vs Business info "${infoName}"`);
  }

  const phone = first(info.businessPhone);
  if (!row.phone && phone) patch.phone = phone;
  const hours = first(info.businessHours);
  if (!row.hours && hours) patch.hours = hours;
  const address = first(info.businessAddress);
  if (!row.address && address) patch.address = address;

  const placeId = clean(row.sourcePlaceId);
  if (!row.googlePlaceId && placeId) patch.googlePlaceId = placeId;

  if (Object.keys(patch).length === 0) continue;
  changed++;
  console.log(`  ${row.id} (${row.repo}): ${Object.keys(patch).join(", ")}`);
  if (COMMIT) await db.update(hubProject).set(patch).where(eq(hubProject.id, row.id));
}

console.log(`\n${rows.length} projects scanned, ${changed} ${COMMIT ? "updated" : "would be updated"}.`);
process.exit(0);
