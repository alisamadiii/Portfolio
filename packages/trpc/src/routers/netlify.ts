import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

import {
  authenticatedProcedure,
  cmsFullAccessProcedure,
  cmsProcedure,
  createTRPCRouter,
} from "../init";
import { latestNetlifyDeploy } from "../lib/content-pilot";
import { getIntegrationAccessToken } from "../lib/integrations";
import { isAdminUser } from "../lib/authz-shared";
import {
  createNetlifySnippet,
  deleteNetlifySnippet,
  deployProjectToNetlify,
  getNetlifyAccount,
  getNetlifyBuildMinutes,
  getNetlifySite,
  getNetlifySiteDns,
  listNetlifySites,
  netlifyAgencyToken,
  getNetlifySsl,
  listNetlifyDeploys,
  listNetlifySnippets,
  netlifyPlan,
  projectOwnerNetlifyUserId,
  netlifyTokenFor,
  netlifyWriteTokenFor,
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

/** projectSite for changes: agency-managed sites are admin-only. */
const projectSiteForWrite = async (
  projectId: string,
  caller: Parameters<typeof netlifyWriteTokenFor>[1]
) => {
  const project = await projectNetlify(projectId);
  if (!project.netlifySiteId) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This site isn't on Netlify yet." });
  }
  const token = await netlifyWriteTokenFor(project, caller);
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

type LinkAccount = "agency" | "owner";

/** Token for a link source: the agency PAT, or the owner's connected Netlify. */
const linkToken = async (projectId: string, account: LinkAccount) => {
  if (account === "agency") {
    const token = netlifyAgencyToken();
    if (!token) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Netlify is not configured on this server.",
      });
    }
    return { token, userId: null };
  }
  const ownerId = await projectOwnerNetlifyUserId(projectId);
  if (!ownerId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The project owner hasn't connected Netlify.",
    });
  }
  return {
    token: await getIntegrationAccessToken(ownerId, "netlify", "Netlify"),
    userId: ownerId,
  };
};

// DB-only (no GitHub token), so it works on every project source.
const adminProjectProcedure = authenticatedProcedure
  .input(z.object({ projectId: z.string().uuid() }))
  .use(({ next, ctx, input }) => {
    if (!isAdminUser(ctx.session.user)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can link a Netlify project." });
    }
    return next({ ctx: { ...ctx, projectId: input.projectId } });
  });

export const netlifyRouter = createTRPCRouter({
  // Where Publish will deploy, for the confirm dialog. DB only, no Netlify call.
  target: cmsProcedure.query(async ({ ctx }) => {
    const project = await projectNetlify(ctx.projectId);
    const plan = await netlifyPlan(ctx.projectId, ctx.user);
    return {
      siteUrl: project.netlifySiteUrl,
      action: plan.action,
      host: plan.action === "deploy" ? plan.host : null,
    };
  }),

  // Admin: existing Netlify sites this project could be linked to, from the
  // agency's Netlify and the owner's connected Netlify (if any).
  linkableSites: adminProjectProcedure.query(async ({ ctx }) => {
    const sources: LinkAccount[] = ["agency", "owner"];
    const lists = await Promise.all(
      sources.map(async (account) => {
        try {
          const { token } = await linkToken(ctx.projectId, account);
          const sites = await listNetlifySites(token);
          return sites.map((site) => ({
            id: site.id,
            name: site.name,
            url: site.ssl_url ?? site.url,
            customDomain: site.custom_domain,
            account,
          }));
        } catch {
          return [];
        }
      })
    );
    return lists.flat();
  }),

  // Admin: pin an existing Netlify site to the project. Later publishes deploy
  // to it with the token of the account it came from.
  linkSite: adminProjectProcedure
    .input(z.object({ siteId: z.string().min(1).max(100), account: z.enum(["agency", "owner"]) }))
    .mutation(async ({ ctx, input }) => {
      const { token, userId } = await linkToken(ctx.projectId, input.account);
      const site = await getNetlifySite(token, input.siteId);
      const url = site.ssl_url ?? site.url;
      const [current] = await db
        .select({ websiteUrl: hubProject.websiteUrl })
        .from(hubProject)
        .where(eq(hubProject.id, ctx.projectId))
        .limit(1);
      await db
        .update(hubProject)
        .set({
          netlifySiteId: site.id,
          netlifySiteUrl: url,
          netlifyConnectedUserId: userId,
          // Fill the live URL the rest of the hub uses, never overwrite one.
          ...(current?.websiteUrl
            ? {}
            : { websiteUrl: site.custom_domain ? `https://${site.custom_domain}` : url }),
        })
        .where(eq(hubProject.id, ctx.projectId));
      return { name: site.name };
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
    const status = await deployProjectToNetlify(ctx.projectId, ctx.user);
    if (status === "needs_netlify") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Connect Netlify to host your website.",
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
      const { token, siteId } = await projectSiteForWrite(ctx.projectId, ctx.user);
      await updateNetlifySite(token, siteId, { custom_domain: input.domain || null });
      return { ok: true };
    }),

  addAlias: cmsFullAccessProcedure.input(domainInput).mutation(async ({ ctx, input }) => {
    const { token, siteId } = await projectSiteForWrite(ctx.projectId, ctx.user);
    const site = await getNetlifySite(token, siteId);
    const aliases = site.domain_aliases ?? [];
    if (input.domain === site.custom_domain || aliases.includes(input.domain)) return { ok: true };
    await updateNetlifySite(token, siteId, { domain_aliases: [...aliases, input.domain] });
    return { ok: true };
  }),

  removeAlias: cmsFullAccessProcedure.input(domainInput).mutation(async ({ ctx, input }) => {
    const { token, siteId } = await projectSiteForWrite(ctx.projectId, ctx.user);
    const site = await getNetlifySite(token, siteId);
    await updateNetlifySite(token, siteId, {
      domain_aliases: (site.domain_aliases ?? []).filter((d) => d !== input.domain),
    });
    return { ok: true };
  }),

  provisionHttps: cmsFullAccessProcedure.mutation(async ({ ctx }) => {
    const { token, siteId } = await projectSiteForWrite(ctx.projectId, ctx.user);
    await provisionNetlifySsl(token, siteId);
    return { ok: true };
  }),

  setForceHttps: cmsFullAccessProcedure
    .input(z.object({ on: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { token, siteId } = await projectSiteForWrite(ctx.projectId, ctx.user);
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
      const { token, siteId } = await projectSiteForWrite(ctx.projectId, ctx.user);
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
      const { token, siteId } = await projectSiteForWrite(ctx.projectId, ctx.user);
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
      const { token, siteId } = await projectSiteForWrite(ctx.projectId, ctx.user);
      await deleteNetlifySnippet(token, siteId, input.id);
      return { ok: true };
    }),
});
