import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

import { cmsFullAccessProcedure, cmsProcedure, createTRPCRouter } from "../init";
import { latestNetlifyDeploy } from "../lib/content-pilot";
import { getConnectedAccount } from "../lib/integrations";
import {
  createNetlifySnippet,
  deleteNetlifySnippet,
  deployProjectToNetlify,
  getNetlifyAccount,
  getNetlifyBuildMinutes,
  getNetlifySite,
  getNetlifySiteDns,
  getNetlifySsl,
  listNetlifyDeploys,
  listNetlifySnippets,
  netlifyTokenFor,
  provisionNetlifySsl,
  updateNetlifySite,
} from "../lib/netlify";
import { dnsRecordFor, normalizeDomain } from "../lib/netlify-shared";

// Netlify page of an upload project: the site, the latest content-pilot build
// job and Netlify's recent deploys. Live from the APIs, nothing cached.

const projectNetlify = async (projectId: string) => {
  const [row] = await db
    .select({
      netlifySiteId: hubProject.netlifySiteId,
      netlifySiteUrl: hubProject.netlifySiteUrl,
      netlifyConnectedUserId: hubProject.netlifyConnectedUserId,
    })
    .from(hubProject)
    .where(eq(hubProject.id, projectId))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
  return row;
};

/** The project's site + the token that can manage it. */
const projectSite = async (projectId: string) => {
  const project = await projectNetlify(projectId);
  if (!project.netlifySiteId) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This site isn't on Netlify yet." });
  }
  const token = await netlifyTokenFor(project);
  return { project, token, siteId: project.netlifySiteId };
};

const domainInput = z.object({
  domain: z
    .string()
    .max(253)
    .transform((v, c) => {
      const d = normalizeDomain(v);
      if (!d) c.addIssue({ code: "custom", message: "Enter a domain like example.com." });
      return d ?? "";
    }),
});

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

const capability = (c?: { included?: number | null; used?: number | null }) =>
  c ? { used: c.used ?? null, included: c.included ?? null } : null;

export const netlifyRouter = createTRPCRouter({
  // Where Publish will deploy, for the confirm dialog. DB only, no Netlify call.
  target: cmsProcedure.query(async ({ ctx }) => {
    const project = await projectNetlify(ctx.projectId);
    const connected = !!(await getConnectedAccount(ctx.user.id, "netlify"));
    return {
      siteUrl: project.netlifySiteUrl,
      // Existing site: who owns it. New site: the caller's Netlify if linked.
      ownedByAgency: project.netlifySiteId
        ? !project.netlifyConnectedUserId
        : !connected,
      connected,
    };
  }),

  overview: cmsProcedure.query(async ({ ctx }) => {
    const project = await projectNetlify(ctx.projectId);
    if (!project.netlifySiteId) return null;

    const token = await netlifyTokenFor(project);
    const [site, deploys, job] = await Promise.all([
      getNetlifySite(token, project.netlifySiteId),
      listNetlifyDeploys(token, project.netlifySiteId),
      latestNetlifyDeploy(ctx.projectId).catch(() => null),
    ]);
    return {
      site: {
        name: site.name,
        url: site.ssl_url ?? site.url,
        adminUrl: site.admin_url,
        customDomain: site.custom_domain,
        ssl: site.ssl,
        createdAt: site.created_at,
        publishedAt: site.published_deploy?.published_at ?? null,
      },
      // Agency-owned sites live in Ali's Netlify: the link is useless to clients.
      ownedByAgency: !project.netlifyConnectedUserId,
      job,
      deploys: deploys.map((d) => ({
        id: d.id,
        state: d.state,
        createdAt: d.created_at,
        publishedAt: d.published_at,
        deployTime: d.deploy_time,
        title: d.title,
        error: d.error_message,
        url: d.deploy_ssl_url,
      })),
    };
  }),

  // Re-runs the build + deploy of the current published version.
  redeploy: cmsFullAccessProcedure.mutation(async ({ ctx }) => {
    if (ctx.source !== "upload") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Only uploaded projects deploy to Netlify from here.",
      });
    }
    const queued = await deployProjectToNetlify(ctx.projectId, ctx.user.id);
    if (!queued) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Connect Netlify in Integrations to deploy this site.",
      });
    }
    return { ok: true };
  }),

  // The client's Netlify team: plan and usage. Hidden for
  // agency-hosted sites (that's the agency's account).
  account: cmsProcedure.query(async ({ ctx }) => {
    const { project, token, siteId } = await projectSite(ctx.projectId);
    if (!project.netlifyConnectedUserId) return null;
    const site = await getNetlifySite(token, siteId);
    const [account, minutes] = await Promise.all([
      getNetlifyAccount(token, site.account_id),
      getNetlifyBuildMinutes(token, site.account_id).catch(() => null),
    ]);
    const included = minutes?.included_minutes != null ? Number(minutes.included_minutes) : null;
    return {
      team: account.name,
      plan: account.type_name ?? null,
      billingPeriod: account.billing_period ?? null,
      nextBillingAt: account.next_billing_period_start ?? null,
      autoTopUp: account.auto_topup_enabled ?? null,
      overLimit: !!account.usages_exceeded,
      members: capability(account.capabilities?.collaborators),
      buildMinutes: minutes
        ? {
            used: minutes.current ?? null,
            included: included != null && Number.isFinite(included) ? included : null,
            periodEnd: minutes.period_end_date ?? null,
          }
        : null,
      usageUrl: `https://app.netlify.com/teams/${account.slug}/usage`,
      billingUrl: `https://app.netlify.com/teams/${account.slug}/billing/general`,
    };
  }),

  domains: cmsProcedure.query(async ({ ctx }) => {
    const { token, siteId } = await projectSite(ctx.projectId);
    const [site, cert, zones] = await Promise.all([
      getNetlifySite(token, siteId),
      getNetlifySsl(token, siteId).catch(() => null),
      getNetlifySiteDns(token, siteId),
    ]);
    const netlifyHost = hostOf(site.url);
    const aliases = site.domain_aliases ?? [];
    const domains = [site.custom_domain, ...aliases].filter((d): d is string => !!d);
    return {
      netlifyHost,
      customDomain: site.custom_domain,
      aliases,
      ssl: !!site.ssl,
      forceSsl: !!site.force_ssl,
      certificate: cert?.state
        ? { state: cert.state, expiresAt: cert.expires_at ?? null, domains: cert.domains ?? [] }
        : null,
      records: domains.map((domain) => ({ domain, ...dnsRecordFor(domain, netlifyHost) })),
      nameservers: zones.flatMap((z) => z.dns_servers ?? []),
      dnsErrors: zones.flatMap((z) => z.errors ?? []),
    };
  }),

  setCustomDomain: cmsFullAccessProcedure
    .input(z.object({ domain: domainInput.shape.domain.nullable() }))
    .mutation(async ({ ctx, input }) => {
      const { token, siteId } = await projectSite(ctx.projectId);
      await updateNetlifySite(token, siteId, { custom_domain: input.domain || null });
      return { ok: true };
    }),

  addAlias: cmsFullAccessProcedure.input(domainInput).mutation(async ({ ctx, input }) => {
    const { token, siteId } = await projectSite(ctx.projectId);
    const site = await getNetlifySite(token, siteId);
    const aliases = site.domain_aliases ?? [];
    if (input.domain === site.custom_domain || aliases.includes(input.domain)) return { ok: true };
    await updateNetlifySite(token, siteId, { domain_aliases: [...aliases, input.domain] });
    return { ok: true };
  }),

  removeAlias: cmsFullAccessProcedure.input(domainInput).mutation(async ({ ctx, input }) => {
    const { token, siteId } = await projectSite(ctx.projectId);
    const site = await getNetlifySite(token, siteId);
    await updateNetlifySite(token, siteId, {
      domain_aliases: (site.domain_aliases ?? []).filter((d) => d !== input.domain),
    });
    return { ok: true };
  }),

  provisionHttps: cmsFullAccessProcedure.mutation(async ({ ctx }) => {
    const { token, siteId } = await projectSite(ctx.projectId);
    await provisionNetlifySsl(token, siteId);
    return { ok: true };
  }),

  setForceHttps: cmsFullAccessProcedure
    .input(z.object({ on: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { token, siteId } = await projectSite(ctx.projectId);
      await updateNetlifySite(token, siteId, { force_ssl: input.on });
      return { ok: true };
    }),

  settings: cmsProcedure.query(async ({ ctx }) => {
    const { project, token, siteId } = await projectSite(ctx.projectId);
    const [site, snippets] = await Promise.all([
      getNetlifySite(token, siteId),
      listNetlifySnippets(token, siteId).catch(() => []),
    ]);
    return {
      prettyUrls: site.processing_settings?.html?.pretty_urls ?? null,
      ownedByAgency: !project.netlifyConnectedUserId,
      badgeUrl: `${site.admin_url}/configuration/general#powered-by-netlify-badge`,
      snippets: snippets.map((s) => ({
        id: s.id,
        title: s.title,
        position: s.general_position,
        preview: s.general.slice(0, 160),
      })),
    };
  }),

  setPrettyUrls: cmsFullAccessProcedure
    .input(z.object({ on: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { token, siteId } = await projectSite(ctx.projectId);
      await updateNetlifySite(token, siteId, {
        processing_settings: { html: { pretty_urls: input.on } },
      });
      return { ok: true };
    }),

  addSnippet: cmsFullAccessProcedure
    .input(
      z.object({
        title: z.string().trim().min(1).max(100),
        html: z.string().trim().min(1).max(10_000),
        position: z.enum(["head", "footer"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { token, siteId } = await projectSite(ctx.projectId);
      await createNetlifySnippet(token, siteId, {
        title: input.title,
        general: input.html,
        general_position: input.position,
      });
      return { ok: true };
    }),

  removeSnippet: cmsFullAccessProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { token, siteId } = await projectSite(ctx.projectId);
      await deleteNetlifySnippet(token, siteId, input.id);
      return { ok: true };
    }),
});
