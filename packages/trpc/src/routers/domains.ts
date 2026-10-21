import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

import { cmsFullAccessProcedure, createTRPCRouter } from "../init";
import {
  createCustomHostname,
  deleteCustomHostname,
  findCustomHostnameByName,
  getCustomHostname,
  isCloudflareSaasConfigured,
  saasCnameTarget,
} from "../lib/cloudflare-saas";
import { requireProjectPlan } from "../lib/cms/feature-access";
import { toTRPCError } from "../lib/cms/errors";
import {
  getImport,
  removeProjectDomain,
  setProjectDomain,
} from "../lib/content-pilot";
import { checkCname, type CnameCheck } from "../lib/dns-check";
import {
  freeSubdomainBase,
  normalizeHost,
  validateCustomHost,
  validateSlug,
} from "../lib/domains";

/**
 * Domains for every project's live site (GitHub-linked and uploaded alike,
 * since every project is a static build served by content-pilot): a free
 * pick-a-name subdomain under the
 * preview wildcard (instant, ungated) and one customer-owned custom domain
 * (plan-gated) with HTTPS via Cloudflare for SaaS. The hub orchestrates:
 * Cloudflare owns certificates and verification, content-pilot owns the
 * host -> repoId serving map, hub_project columns hold the UI state.
 *
 * websiteUrl invariant: only rewritten on verified or explicit actions, and
 * the pilot's own `site-<id>` live URL stays derivable as the fallback.
 */

const projectRow = async (repoId: number) => {
  const [project] = await db
    .select({
      freeSubdomain: hubProject.freeSubdomain,
      customDomain: hubProject.customDomain,
      customDomainStatus: hubProject.customDomainStatus,
      customDomainCfId: hubProject.customDomainCfId,
      websiteUrl: hubProject.websiteUrl,
    })
    .from(hubProject)
    .where(eq(hubProject.repoId, repoId))
    .limit(1);
  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  }
  return project;
};

/** The free subdomain's public URL (scheme follows the base's convention). */
const freeUrl = (slug: string) => {
  const base = freeSubdomainBase();
  const scheme = base.includes("localhost") ? "http" : "https";
  return `${scheme}://${slug}.${base}`;
};

/** websiteUrl fallback when a domain goes away: free slug, else pilot URL. */
const fallbackWebsiteUrl = async (
  repoId: number,
  freeSlug: string | null
): Promise<string | null> => {
  if (freeSlug) return freeUrl(freeSlug);
  const status = await getImport(repoId).catch(() => null);
  return status?.liveUrl ?? null;
};

export const domainsRouter = createTRPCRouter({
  /** Everything the Domain panel needs in one read. */
  status: cmsFullAccessProcedure.query(async ({ ctx }) => {
    const project = await projectRow(ctx.repoId);
    const pilot = await getImport(ctx.repoId).catch(() => null);

    let cf: { hostnameStatus: string; sslStatus: string } | null = null;
    if (
      project.customDomain &&
      project.customDomainStatus === "pending" &&
      project.customDomainCfId &&
      isCloudflareSaasConfigured()
    ) {
      const hostname = await getCustomHostname(project.customDomainCfId).catch(
        () => null
      );
      if (hostname) {
        cf = { hostnameStatus: hostname.status, sslStatus: hostname.ssl.status };
      }
    }

    return {
      free: project.freeSubdomain
        ? { slug: project.freeSubdomain, url: freeUrl(project.freeSubdomain) }
        : null,
      custom: project.customDomain
        ? {
            domain: project.customDomain,
            status: (project.customDomainStatus ?? "pending") as
              | "pending"
              | "active",
            dns: {
              type: "CNAME" as const,
              name: project.customDomain,
              value: saasCnameTarget(),
            },
            cf,
          }
        : null,
      fallbackUrl: pilot?.liveUrl ?? null,
      baseDomain: freeSubdomainBase(),
      customDomainsConfigured:
        isCloudflareSaasConfigured() || process.env.NODE_ENV !== "production",
    };
  }),

  /** Free subdomain: instant, ungated. Empty slug clears it. */
  setFreeSubdomain: cmsFullAccessProcedure
    .input(z.object({ slug: z.string().trim().toLowerCase().max(63) }))
    .mutation(async ({ ctx, input }) => {
        const project = await projectRow(ctx.repoId);

      if (!input.slug) {
        if (project.freeSubdomain) {
          const base = freeSubdomainBase();
          await removeProjectDomain(
            ctx.repoId,
            `${project.freeSubdomain}.${base}`
          );
        }
        const websiteUrl =
          project.customDomainStatus === "active" && project.customDomain
            ? project.websiteUrl
            : ((await getImport(ctx.repoId).catch(() => null))?.liveUrl ?? null);
        await db
          .update(hubProject)
          .set({ freeSubdomain: null, websiteUrl })
          .where(eq(hubProject.repoId, ctx.repoId));
        return { slug: null };
      }

      let slug: string;
      try {
        slug = validateSlug(input.slug);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Invalid name.",
        });
      }
      // Pilot validates authoritatively and answers 409 when taken.
      const result = await setProjectDomain(ctx.repoId, { slug });
      // An active custom domain stays the public websiteUrl.
      const keepCustom =
        project.customDomainStatus === "active" && project.customDomain;
      await db
        .update(hubProject)
        .set({
          freeSubdomain: slug,
          ...(keepCustom ? {} : { websiteUrl: result.url }),
        })
        .where(eq(hubProject.repoId, ctx.repoId));
      return { slug, url: result.url };
    }),

  /** Step 1 of custom domains: register the hostname with Cloudflare. */
  addCustomDomain: cmsFullAccessProcedure
    .input(
      z.object({
        domain: z
          .string()
          .trim()
          .toLowerCase()
          .transform((value) =>
            value.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
          ),
      })
    )
    .mutation(async ({ ctx, input }) => {
        await requireProjectPlan(ctx.user, ctx.repoId, {
        owner: ctx.owner,
        repo: ctx.repo,
      });
      const project = await projectRow(ctx.repoId);
      if (project.customDomain) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Remove the current domain before adding a new one.",
        });
      }

      let host: string;
      try {
        host = validateCustomHost(input.domain);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Invalid domain.",
        });
      }

      let cfId: string | null = null;
      if (isCloudflareSaasConfigured()) {
        const existing = await findCustomHostnameByName(host);
        const hostname = existing ?? (await createCustomHostname(host));
        cfId = hostname.id;
      } else if (process.env.NODE_ENV === "production") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Custom domains are not configured on this server.",
        });
      }

      await db
        .update(hubProject)
        .set({
          customDomain: host,
          customDomainCfId: cfId,
          customDomainStatus: "pending",
        })
        .where(eq(hubProject.repoId, ctx.repoId));

      return {
        domain: host,
        dns: { type: "CNAME" as const, name: host, value: saasCnameTarget() },
      };
    }),

  /** Step 2: check Cloudflare; on verified, go live. */
  verifyCustomDomain: cmsFullAccessProcedure.mutation(async ({ ctx }) => {
    await requireProjectPlan(ctx.user, ctx.repoId, {
      owner: ctx.owner,
      repo: ctx.repo,
    });
    const project = await projectRow(ctx.repoId);
    if (!project.customDomain || project.customDomainStatus !== "pending") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "There is no domain waiting for verification.",
      });
    }
    const host = project.customDomain;

    let verified = false;
    let cf: { hostnameStatus: string; sslStatus: string } | null = null;
    if (!isCloudflareSaasConfigured()) {
      if (process.env.NODE_ENV === "production") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Custom domains are not configured on this server.",
        });
      }
      // Local dev shortcut: no Cloudflare, treat as verified so the pilot
      // mapping can be exercised end to end.
      verified = true;
    } else {
      if (!project.customDomainCfId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This domain setup is stale. Remove it and add it again.",
        });
      }
      const hostname = await getCustomHostname(project.customDomainCfId);
      if (!hostname) {
        // Stale pointer: the CF hostname is gone; reset so the user restarts.
        await db
          .update(hubProject)
          .set({
            customDomain: null,
            customDomainCfId: null,
            customDomainStatus: null,
          })
          .where(eq(hubProject.repoId, ctx.repoId));
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This domain setup expired. Add the domain again.",
        });
      }
      cf = { hostnameStatus: hostname.status, sslStatus: hostname.ssl.status };
      verified =
        hostname.status === "active" && hostname.ssl.status === "active";
    }

    if (!verified) {
      // Friendlier copy only — Cloudflare is the verification authority.
      const dns: CnameCheck = await checkCname(host, saasCnameTarget()).catch(
        () => ({ state: "error" as const })
      );
      return { verified: false as const, cf, dns: dns.state };
    }

    // Order matters: the serving map first (a CF-active domain with no pilot
    // mapping would show visitors the proxy 404), then the hub state.
    try {
      await setProjectDomain(ctx.repoId, { host });
    } catch (error) {
      throw toTRPCError(error);
    }
    await db
      .update(hubProject)
      .set({
        customDomainStatus: "active",
        websiteUrl: `https://${host}`,
      })
      .where(eq(hubProject.repoId, ctx.repoId));
    return { verified: true as const };
  }),

  /** Remove/cancel the custom domain (allowed without a plan for cleanup). */
  removeCustomDomain: cmsFullAccessProcedure.mutation(async ({ ctx }) => {
    const project = await projectRow(ctx.repoId);
    if (!project.customDomain) return { removed: true };

    if (project.customDomainCfId && isCloudflareSaasConfigured()) {
      // Best-effort: a CF blip must not strand the user with a stuck domain.
      await deleteCustomHostname(project.customDomainCfId).catch((error) =>
        console.error("[domains] cf delete failed", error)
      );
    }
    await removeProjectDomain(ctx.repoId, project.customDomain);
    const websiteUrl = await fallbackWebsiteUrl(
      ctx.repoId,
      project.freeSubdomain
    );
    await db
      .update(hubProject)
      .set({
        customDomain: null,
        customDomainCfId: null,
        customDomainStatus: null,
        websiteUrl,
      })
      .where(eq(hubProject.repoId, ctx.repoId));
    return { removed: true };
  }),
});
