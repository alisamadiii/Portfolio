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
  attachWorkerDomain,
  createCfDnsRecord,
  deleteCfDnsRecord,
  detachWorkerDomain,
  getWorkerDomain,
  listCfAccounts,
  listCfDnsRecords,
  listCfZones,
  resolveZoneForHost,
} from "@workspace/trpc/routers/integrations/cloudflare";

// Domain management. Domains live on the user's Cloudflare; adding one attaches
// it to the project's Worker (Workers Custom Domains) — CF creates the DNS
// record + cert. The DNS tab manages a separately-chosen project zone.

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

export type ProjectCf = {
  token: string;
  connectedUserId: string;
  accountId: string;
  workerName: string | null;
  cfZoneId: string | null;
};

/**
 * Cloudflare context for a project: the token (from the project's connected CF
 * user, or the caller as bootstrap), the account the Worker is on, its name,
 * and the project's chosen DNS zone. Returns null when no CF is linked.
 */
export async function resolveProjectCf(
  owner: string | undefined,
  repo: string,
  callerId: string
): Promise<ProjectCf | null> {
  const [project] = await db
    .select({
      cfConnectedUserId: hubProject.cfConnectedUserId,
      cfAccountId: hubProject.cfAccountId,
      cfPagesProject: hubProject.cfPagesProject,
      cfZoneId: hubProject.cfZoneId,
    })
    .from(hubProject)
    .where(ownerRepoWhere(owner, repo))
    .limit(1);
  const userId = project?.cfConnectedUserId ?? callerId;
  const account = await getConnectedAccount(userId, "cloudflare");
  if (!account) return null;
  const token = await getIntegrationAccessToken(userId, "cloudflare", "Cloudflare");
  // Fall back to the sole CF account when the project has no stored one.
  let accountId = project?.cfAccountId ?? "";
  if (!accountId) {
    const accounts = await listCfAccounts(token);
    accountId = accounts[0]?.id ?? "";
  }
  return {
    token,
    connectedUserId: userId,
    accountId,
    workerName: project?.cfPagesProject ?? null,
    cfZoneId: project?.cfZoneId ?? null,
  };
}

const reconnect = () =>
  new TRPCError({
    code: "PRECONDITION_FAILED",
    message: "Cloudflare needs to be reconnected.",
  });

/** The project's chosen DNS zone, or throw when unset. */
async function requireProjectZone(cf: ProjectCf): Promise<string> {
  if (!cf.cfZoneId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Pick a DNS zone for this project first.",
    });
  }
  return cf.cfZoneId;
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
   * Add a domain: attach it to the project's Worker via Workers Custom Domains
   * (the domain's zone must be on the user's Cloudflare). CF creates the DNS
   * record + issues the cert; we store the custom-domain id + status.
   */
  add: cmsFullAccessProcedure
    .input(z.object({ domain: hostname }))
    .mutation(async ({ ctx, input }) => {
      try {
        const repoId = await resolveRepoId(input.owner, input.repo);
        const existing = await listByRepo(repoId);
        if (existing.some((d) => d.domain === input.domain)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That domain is already on this project.",
          });
        }
        const cf = await resolveProjectCf(input.owner, input.repo, ctx.user.id);
        if (!cf) throw reconnect();
        if (!cf.workerName) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Import or deploy this project to Cloudflare before adding a domain.",
          });
        }
        const zone = await resolveZoneForHost(cf.token, cf.accountId, input.domain);
        if (!zone) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Add this domain to your Cloudflare account first, then try again.",
          });
        }
        const attached = await attachWorkerDomain(cf.token, cf.accountId, {
          hostname: input.domain,
          service: cf.workerName,
          zoneId: zone.id,
        });
        // Stamp the project's CF user + account on first bind.
        await db
          .update(hubProject)
          .set({ cfConnectedUserId: cf.connectedUserId, cfAccountId: cf.accountId })
          .where(ownerRepoWhere(input.owner, input.repo));
        // Workers Custom Domains on a zone already on the account serve
        // immediately (the zone's edge cert covers it) — a successful attach is
        // active. The CF domain object carries no cert-status field to poll.
        await db.insert(hubDomain).values({
          repoId,
          domain: input.domain,
          isPrimary: existing.length === 0,
          cfZoneId: zone.id,
          cfDomainId: attached.id,
          status: "active",
        });
        revalidateWebsiteStatus();
        return { domains: sortForDisplay(await listByRepo(repoId)) };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),

  /** Re-check a domain's Workers Custom Domain status. */
  verify: cmsProcedure
    .input(z.object({ domain: hostname }))
    .mutation(async ({ ctx, input }) => {
      try {
        const repoId = await resolveRepoId(input.owner, input.repo);
        const [row] = await db
          .select({ cfDomainId: hubDomain.cfDomainId })
          .from(hubDomain)
          .where(and(eq(hubDomain.repoId, repoId), eq(hubDomain.domain, input.domain)))
          .limit(1);
        if (!row) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Domain not found." });
        }
        // No cfDomainId → the built-in *.workers.dev route: always live.
        // Otherwise confirm the Workers Custom Domain still exists on CF; a
        // successful fetch means it's attached and serving (no cert-status
        // field is returned to poll).
        if (row.cfDomainId) {
          const cf = await resolveProjectCf(input.owner, input.repo, ctx.user.id);
          if (!cf) throw reconnect();
          await getWorkerDomain(cf.token, cf.accountId, row.cfDomainId);
        }
        await db
          .update(hubDomain)
          .set({ status: "active", updatedAt: new Date() })
          .where(and(eq(hubDomain.repoId, repoId), eq(hubDomain.domain, input.domain)));
        return { domains: sortForDisplay(await listByRepo(repoId)) };
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

  /** Remove a domain: detach from the Worker (best-effort), promote next primary. */
  remove: cmsProcedure
    .input(z.object({ domain: hostname }))
    .mutation(async ({ ctx, input }) => {
      try {
        const repoId = await resolveRepoId(input.owner, input.repo);
        const [removed] = await db
          .delete(hubDomain)
          .where(and(eq(hubDomain.repoId, repoId), eq(hubDomain.domain, input.domain)))
          .returning({ isPrimary: hubDomain.isPrimary, cfDomainId: hubDomain.cfDomainId });
        if (removed?.cfDomainId) {
          try {
            const cf = await resolveProjectCf(input.owner, input.repo, ctx.user.id);
            if (cf) await detachWorkerDomain(cf.token, cf.accountId, removed.cfDomainId);
          } catch {
            // Row is gone; leave the CF custom domain if detach fails.
          }
        }
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

  // ─── DNS (project zone) ────────────────────────────────────────

  /** The project's chosen DNS zone (null when unset). */
  dnsZone: cmsProcedure.query(async ({ ctx, input }) => {
    try {
      const cf = await resolveProjectCf(input.owner, input.repo, ctx.user.id);
      if (!cf) return { connected: false, zone: null };
      if (!cf.cfZoneId) return { connected: true, zone: null };
      const zones = await listCfZones(cf.token, cf.accountId);
      const zone = zones.find((z) => z.id === cf.cfZoneId);
      return {
        connected: true,
        zone: { id: cf.cfZoneId, name: zone?.name ?? cf.cfZoneId },
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  }),

  /** All CF zones the project's account can use — for the DNS-zone dropdown. */
  dnsZones: cmsProcedure.query(async ({ ctx, input }) => {
    try {
      const cf = await resolveProjectCf(input.owner, input.repo, ctx.user.id);
      if (!cf) return { connected: false, zones: [] as { id: string; name: string }[] };
      const zones = await listCfZones(cf.token, cf.accountId);
      return { connected: true, zones: zones.map((z) => ({ id: z.id, name: z.name })) };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  }),

  /** Set the project's DNS zone. */
  setDnsZone: cmsFullAccessProcedure
    .input(z.object({ zoneId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const cf = await resolveProjectCf(input.owner, input.repo, ctx.user.id);
        if (!cf) throw reconnect();
        const zones = await listCfZones(cf.token, cf.accountId);
        if (!zones.some((z) => z.id === input.zoneId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Your Cloudflare account has no access to that zone.",
          });
        }
        await db
          .update(hubProject)
          .set({
            cfZoneId: input.zoneId,
            cfConnectedUserId: cf.connectedUserId,
            cfAccountId: cf.accountId,
          })
          .where(ownerRepoWhere(input.owner, input.repo));
        return { ok: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),

  /** DNS records for the project's zone. */
  dnsRecords: cmsProcedure.query(async ({ ctx, input }) => {
    try {
      const cf = await resolveProjectCf(input.owner, input.repo, ctx.user.id);
      if (!cf) throw reconnect();
      const zoneId = await requireProjectZone(cf);
      return { records: await listCfDnsRecords(cf.token, zoneId) };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  }),

  /** Add a DNS record to the project's zone. */
  addDnsRecord: cmsFullAccessProcedure
    .input(z.object({ record: dnsRecordInput }))
    .mutation(async ({ ctx, input }) => {
      try {
        const cf = await resolveProjectCf(input.owner, input.repo, ctx.user.id);
        if (!cf) throw reconnect();
        const zoneId = await requireProjectZone(cf);
        await createCfDnsRecord(cf.token, zoneId, input.record);
        return { records: await listCfDnsRecords(cf.token, zoneId) };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),

  /** Delete a DNS record from the project's zone. */
  deleteDnsRecord: cmsFullAccessProcedure
    .input(z.object({ recordId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const cf = await resolveProjectCf(input.owner, input.repo, ctx.user.id);
        if (!cf) throw reconnect();
        const zoneId = await requireProjectZone(cf);
        await deleteCfDnsRecord(cf.token, zoneId, input.recordId);
        return { records: await listCfDnsRecords(cf.token, zoneId) };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),
});
