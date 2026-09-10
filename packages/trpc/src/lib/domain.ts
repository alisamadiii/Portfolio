/**
 * Site-URL derivation from hub_domain rows. The hub DB is the source of truth —
 * domains are plain metadata (no provider, no verification). One row per repo is
 * flagged `isPrimary`; that domain drives the derived website URL shown across
 * the hub.
 */

import { inArray } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { hubDomain } from "@workspace/drizzle/schema";

type DomainRow = typeof hubDomain.$inferSelect;

/** The canonical domain for a repo: the primary row, else the first added. */
const pickPrimaryDomain = (rows: DomainRow[]): DomainRow | null => {
  if (rows.length === 0) return null;
  return (
    rows.find((r) => r.isPrimary) ??
    [...rows].sort((a, b) => a.id - b.id)[0] ??
    null
  );
};

const deriveWebsiteUrl = (rows: DomainRow[]): string | null => {
  const primary = pickPrimaryDomain(rows);
  return primary ? `https://${primary.domain}` : null;
};

/**
 * Batch: derived website URL per repoId (one query for N repos). Repos with no
 * domain rows are simply absent from the map.
 */
const getWebsiteUrlsByRepoId = async (
  repoIds: number[]
): Promise<Map<number, string | null>> => {
  if (repoIds.length === 0) return new Map();

  const rows = await db
    .select()
    .from(hubDomain)
    .where(inArray(hubDomain.repoId, repoIds));

  const byRepoId = new Map<number, DomainRow[]>();
  for (const row of rows) {
    const list = byRepoId.get(row.repoId) ?? [];
    list.push(row);
    byRepoId.set(row.repoId, list);
  }

  return new Map(
    [...byRepoId.entries()].map(([repoId, domainRows]) => [
      repoId,
      deriveWebsiteUrl(domainRows),
    ])
  );
};

export { deriveWebsiteUrl, getWebsiteUrlsByRepoId, pickPrimaryDomain };
export type { DomainRow };
