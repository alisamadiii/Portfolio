/**
 * Sets agency_lead.channel on leads captured before channels existed, using
 * the same classifier as capture. Run once per database (DATABASE_URL in
 * packages/drizzle/.env decides):
 *   npx tsx packages/trpc/scripts/backfill-lead-channel.mts
 * Idempotent: only touches rows whose channel is still null.
 */

import * as path from "path";
import * as dotenv from "dotenv";
import { eq, isNull } from "drizzle-orm";

import { agencyLead, hubProject } from "@workspace/drizzle/schema";

import { classifyLead } from "../src/lib/agency/lead-channel";

dotenv.config({ path: path.resolve(process.cwd(), "packages/drizzle/.env") });
// The pool reads DATABASE_URL on import, so load it after dotenv.
const { db } = await import("@workspace/drizzle/pool");
const { pool } = await import("@workspace/drizzle/index");

const hostOf = (url: string | null) => {
  if (!url) return null;
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).hostname;
  } catch {
    return null;
  }
};

const rows = await db
  .select({
    id: agencyLead.id,
    source: agencyLead.source,
    gclid: agencyLead.gclid,
    gbraid: agencyLead.gbraid,
    wbraid: agencyLead.wbraid,
    utm: agencyLead.utm,
    referrer: agencyLead.referrer,
    pageUrl: agencyLead.pageUrl,
    websiteUrl: hubProject.websiteUrl,
    customDomain: hubProject.customDomain,
  })
  .from(agencyLead)
  .leftJoin(hubProject, eq(hubProject.repoId, agencyLead.repoId))
  .where(isNull(agencyLead.channel));

const counts: Record<string, number> = {};
for (const row of rows) {
  const channel = classifyLead({
    ...row,
    // The page the form was on is the client's own site.
    siteHost: hostOf(row.pageUrl) ?? hostOf(row.customDomain) ?? hostOf(row.websiteUrl),
  });
  await db.update(agencyLead).set({ channel }).where(eq(agencyLead.id, row.id));
  counts[channel] = (counts[channel] ?? 0) + 1;
}

console.log(`Backfilled ${rows.length} leads`, counts);
await pool.end();
