import { revalidateTag } from "next/cache";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, sql } from "drizzle-orm";
import z from "zod";

import {
  cmsFullAccessProcedure,
  cmsProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import { hubDomain, hubProject } from "@workspace/drizzle/schema";

import { toTRPCError } from "@workspace/trpc/lib/cms/errors";
import { resolveRepoId } from "@workspace/trpc/lib/cms/repo-id";
import { deriveWebsiteUrl } from "@workspace/trpc/lib/domain";
import {
  getConnectedAccount,
  getIntegrationAccessToken,
} from "@workspace/trpc/lib/integrations";
import {
  createCfDnsRecord,
  deleteCfDnsRecord,
  listCfDnsRecords,
  listCfZones,
} from "@workspace/trpc/routers/integrations/cloudflare";

// Domain management is open to every collaborator of the repo (cmsProcedure, no
// admin assert) — clients manage their own domains. The hub DB is the source of
// truth: domains are plain metadata the client points at their own host. No
// provider, no verification, no DNS-record generation.

// The home page website-status card caches per-URL ping results under this tag;
// bust it whenever the domain set (and thus the derived URL) changes.
const revalidateWebsiteStatus = () =>
  revalidateTag("website-status", { expire: 0 });

// A bare hostname, e.g. "acme.com" / "www.acme.com". No scheme, no path.
const hostname = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/,
    "Enter a valid domain, e.g. example.com (no https:// or path)."
  );

const listByRepo = (repoId: number) =>
  db
    .select()
    .from(hubDomain)
    .where(eq(hubDomain.repoId, repoId))
    .orderBy(asc(hubDomain.id));

/** Primary first, then by insertion order — the shape the panel renders. */
const sortForDisplay = <T extends { isPrimary: boolean; id: number }>(
  rows: T[]
) => [...rows].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.id - b.id);

const ownerRepoWhere = (owner: string | undefined, repo: string) => {
  const org = owner ?? process.env.GITHUB_ORG;
  return sql`lower(${hubProject.owner}) = lower(${org}) and lower(${hubProject.repo}) = lower(${repo})`;
};

/**
 * Cloudflare access for a project. Uses the project's stored connected user's
 * token when set (so any collaborator sees the same zones/DNS), else the
 * caller's own — which lets the first CF-connected user bootstrap the binding.
 * Returns null when neither has Cloudflare linked.
 */
async function resolveProjectCfToken(
  owner: string | undefined,
  repo: string,
  callerId: string
): Promise<{ token: string; connectedUserId: string } | null> {
  const [project] = await db
    .select({ cfConnectedUserId: hubProject.cfConnectedUserId })
    .from(hubProject)
    .where(ownerRepoWhere(owner, repo))
    .limit(1);
  const userId = project?.cfConnectedUserId ?? callerId;
  const account = await getConnectedAccount(userId, "cloudflare");
  if (!account) return null;
  const token = await getIntegrationAccessToken(userId, "cloudflare", "Cloudflare");
  return { token, connectedUserId: userId };
}

/** The bound CF zone id for a domain, or throw if the domain is manual/unbound. */
async function requireBoundZone(repoId: number, domain: string): Promise<string> {
  const [row] = await db
    .select({ cfZoneId: hubDomain.cfZoneId })
    .from(hubDomain)
    .where(and(eq(hubDomain.repoId, repoId), eq(hubDomain.domain, domain)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Domain not found." });
  if (!row.cfZoneId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This domain isn't linked to a Cloudflare zone.",
    });
  }
  return row.cfZoneId;
}

const dnsRecordInput = z.object({
  type: z.enum(["A", "AAAA", "CNAME", "TXT", "MX", "NS", "SRV", "CAA"]),
  name: z.string().trim().min(1),
  content: z.string().trim().min(1),
  proxied: z.boolean().optional(),
  ttl: z.number().int().optional(),
});

export const domainRouter = createTRPCRouter({
  /** Every domain of the repo (primary first) + the derived website URL. */
  list: cmsProcedure.query(async ({ input }) => {
    try {
      const repoId = await resolveRepoId(input.owner, input.repo);
      const domains = await listByRepo(repoId);
      return { domains: sortForDisplay(domains), websiteUrl: deriveWebsiteUrl(domains) };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  }),

  /**
   * Add a domain. The first domain added to a repo becomes primary. When a
   * Cloudflare zoneId is supplied (domain picked from the CF dropdown), it's
   * validated against the caller's zones, bound to the row, and the project's
   * CF connected-user is stamped so DNS reads work for every collaborator.
   */
  add: cmsProcedure
    .input(z.object({ domain: hostname, zoneId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const repoId = await resolveRepoId(input.owner, input.repo);
        const existing = await listByRepo(repoId);

        // A CF zone is the apex — add both the apex and its www subdomain (both
        // bound to the zone). Free-text custom adds the single typed domain.
        const wanted = input.zoneId
          ? [input.domain, `www.${input.domain}`]
          : [input.domain];
        const toInsert = wanted.filter(
          (d) => !existing.some((e) => e.domain === d)
        );
        if (toInsert.length === 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That domain is already on this project.",
          });
        }

        if (input.zoneId) {
          const cf = await resolveProjectCfToken(input.owner, input.repo, ctx.user.id);
          if (!cf) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "Connect Cloudflare before picking a zone.",
            });
          }
          const zones = await listCfZones(cf.token);
          if (!zones.some((z) => z.id === input.zoneId)) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Your Cloudflare account has no access to that zone.",
            });
          }
          // Stamp the project's CF user on first binding (mirrors GA connect).
          await db
            .update(hubProject)
            .set({ cfConnectedUserId: cf.connectedUserId })
            .where(and(ownerRepoWhere(input.owner, input.repo), sql`${hubProject.cfConnectedUserId} is null`));
        }

        await db.insert(hubDomain).values(
          toInsert.map((domain, index) => ({
            repoId,
            domain,
            // First domain on an empty repo becomes primary (apex wins the pair).
            isPrimary: existing.length === 0 && index === 0,
            cfZoneId: input.zoneId ?? null,
          }))
        );

        revalidateWebsiteStatus();
        return { domains: sortForDisplay(await listByRepo(repoId)) };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),

  /**
   * Cloudflare zones the project can pick from. Uses the project's connected CF
   * user (or the caller as bootstrap). `connected: false` → the panel shows the
   * plain free-text input only.
   */
  cfZones: cmsProcedure.query(async ({ ctx, input }) => {
    try {
      const cf = await resolveProjectCfToken(input.owner, input.repo, ctx.user.id);
      if (!cf) return { connected: false, zones: [] as { id: string; name: string }[] };
      const zones = await listCfZones(cf.token);
      return {
        connected: true,
        zones: zones.map((z) => ({ id: z.id, name: z.name })),
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  }),

  /** DNS records for a domain's bound Cloudflare zone. */
  dnsRecords: cmsProcedure
    .input(z.object({ domain: hostname }))
    .query(async ({ ctx, input }) => {
      try {
        const repoId = await resolveRepoId(input.owner, input.repo);
        const zoneId = await requireBoundZone(repoId, input.domain);
        const cf = await resolveProjectCfToken(input.owner, input.repo, ctx.user.id);
        if (!cf) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Cloudflare needs to be reconnected.",
          });
        }
        const records = await listCfDnsRecords(cf.token, zoneId);
        return { records };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),

  /** Add a DNS record to a domain's bound zone. */
  addDnsRecord: cmsFullAccessProcedure
    .input(z.object({ domain: hostname, record: dnsRecordInput }))
    .mutation(async ({ ctx, input }) => {
      try {
        const repoId = await resolveRepoId(input.owner, input.repo);
        const zoneId = await requireBoundZone(repoId, input.domain);
        const cf = await resolveProjectCfToken(input.owner, input.repo, ctx.user.id);
        if (!cf) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Cloudflare needs to be reconnected.",
          });
        }
        await createCfDnsRecord(cf.token, zoneId, input.record);
        return { records: await listCfDnsRecords(cf.token, zoneId) };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),

  /** Delete a DNS record from a domain's bound zone. */
  deleteDnsRecord: cmsFullAccessProcedure
    .input(z.object({ domain: hostname, recordId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const repoId = await resolveRepoId(input.owner, input.repo);
        const zoneId = await requireBoundZone(repoId, input.domain);
        const cf = await resolveProjectCfToken(input.owner, input.repo, ctx.user.id);
        if (!cf) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Cloudflare needs to be reconnected.",
          });
        }
        await deleteCfDnsRecord(cf.token, zoneId, input.recordId);
        return { records: await listCfDnsRecords(cf.token, zoneId) };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),

  /** Rename a domain in place. */
  update: cmsProcedure
    .input(z.object({ domain: hostname, newDomain: hostname }))
    .mutation(async ({ input }) => {
      try {
        const repoId = await resolveRepoId(input.owner, input.repo);
        if (input.newDomain !== input.domain) {
          const existing = await listByRepo(repoId);
          if (existing.some((d) => d.domain === input.newDomain)) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "That domain is already on this project.",
            });
          }
        }

        const updated = await db
          .update(hubDomain)
          .set({ domain: input.newDomain, updatedAt: new Date() })
          .where(and(eq(hubDomain.repoId, repoId), eq(hubDomain.domain, input.domain)))
          .returning({ id: hubDomain.id });
        if (updated.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Domain not found." });
        }

        revalidateWebsiteStatus();
        return { domains: sortForDisplay(await listByRepo(repoId)) };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),

  /** Make a domain the primary (canonical) one for the repo. */
  setPrimary: cmsProcedure
    .input(z.object({ domain: hostname }))
    .mutation(async ({ input }) => {
      try {
        const repoId = await resolveRepoId(input.owner, input.repo);
        // neon-http has no interactive transactions; sequential writes are fine
        // here — one primary flag flips per repo, no concurrent contention.
        const rows = await db
          .select({ id: hubDomain.id })
          .from(hubDomain)
          .where(and(eq(hubDomain.repoId, repoId), eq(hubDomain.domain, input.domain)));
        if (rows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Domain not found." });
        }
        await db
          .update(hubDomain)
          .set({ isPrimary: false })
          .where(eq(hubDomain.repoId, repoId));
        await db
          .update(hubDomain)
          .set({ isPrimary: true, updatedAt: new Date() })
          .where(and(eq(hubDomain.repoId, repoId), eq(hubDomain.domain, input.domain)));

        revalidateWebsiteStatus();
        return { domains: sortForDisplay(await listByRepo(repoId)) };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),

  /** Remove a domain. If it was primary, the earliest remaining one is promoted. */
  remove: cmsProcedure
    .input(z.object({ domain: hostname }))
    .mutation(async ({ input }) => {
      try {
        const repoId = await resolveRepoId(input.owner, input.repo);
        // neon-http has no interactive transactions; delete then promote the
        // next domain sequentially (single-user domain management, no contention).
        const [removed] = await db
          .delete(hubDomain)
          .where(and(eq(hubDomain.repoId, repoId), eq(hubDomain.domain, input.domain)))
          .returning({ isPrimary: hubDomain.isPrimary });
        if (removed?.isPrimary) {
          const [next] = await db
            .select({ id: hubDomain.id })
            .from(hubDomain)
            .where(eq(hubDomain.repoId, repoId))
            .orderBy(asc(hubDomain.id))
            .limit(1);
          if (next) {
            await db
              .update(hubDomain)
              .set({ isPrimary: true, updatedAt: new Date() })
              .where(eq(hubDomain.id, next.id));
          }
        }

        revalidateWebsiteStatus();
        return { domains: sortForDisplay(await listByRepo(repoId)) };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),
});
