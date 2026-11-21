import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/pool";
import { hubProject } from "@workspace/drizzle/schema";

import { cmsFullAccessProcedure, cmsProcedure, cmsWriteProcedure, createTRPCRouter } from "../init";
import { isProjectOwnerOrAdmin } from "../lib/cms/authz";
import { roleAtLeast } from "../lib/authz-shared";
import {
  createSite,
  getEndpoints,
  getPages,
  getSite,
  isSitewatchConfigured,
  listIncidents,
  listRuns,
  runCheck,
  setIncidentMuted,
  SitewatchError,
} from "../lib/sitewatch";
import { siteHost } from "../lib/sitewatch-shared";
import { normalizeWebsiteUrl } from "../lib/website-url";
import { rateLimit } from "../middleware/rate-limit";

// Site Monitor page: the project's website as seen by sitewatch (uptime,
// problems, pages, check history). The project's website_url is the only
// link; the client never sends a sitewatch id, so a project only ever reads
// its own site.

const projectWebsite = async (projectId: string) =>
  (
    await db.query.hubProject.findFirst({
      where: eq(hubProject.id, projectId),
      columns: { websiteUrl: true },
    })
  )?.websiteUrl ?? null;

/** The project's monitored host, or a clear error when there's no website yet. */
const requireHost = async (projectId: string) => {
  const websiteUrl = await projectWebsite(projectId);
  const host = websiteUrl ? siteHost(websiteUrl) : null;
  if (!host) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Add your website address first." });
  return host;
};

/** sitewatch failures -> tRPC errors the hub can show. */
const call = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    if (error instanceof SitewatchError) {
      throw new TRPCError({
        code: error.status === 404 ? "NOT_FOUND" : error.status < 500 ? "BAD_REQUEST" : "BAD_GATEWAY",
        message: error.message,
      });
    }
    throw new TRPCError({ code: "BAD_GATEWAY", message: "Site Monitor is unreachable. Try again in a moment." });
  }
};

// Manual checks crawl the whole site; keep them rare.
const RUN_LIMIT = { max: 3, windowMs: 10 * 60 * 1000, scope: "site-monitor-run" };

export const siteMonitorRouter = createTRPCRouter({
  /** Which screen to show, plus the dashboard when the site is monitored. */
  overview: cmsProcedure.query(async ({ ctx }) => {
    const [websiteUrl, ownerOrAdmin] = await Promise.all([
      projectWebsite(ctx.projectId),
      isProjectOwnerOrAdmin(ctx.user, ctx.projectId),
    ]);
    const access = {
      /** May start monitoring the saved website. */
      canConnect: ctx.role === "full-access",
      /** May set the website address (same rule as project.setWebsiteUrl). */
      canEditDomain: ctx.role === "full-access" && ownerOrAdmin,
      /** Run check now, mute problems. */
      canAct: roleAtLeast(ctx.role, "content-editor"),
    };
    if (!isSitewatchConfigured()) return { state: "unconfigured" as const, access, websiteUrl };
    const host = websiteUrl ? siteHost(websiteUrl) : null;
    if (!websiteUrl || !host) return { state: "no-domain" as const, access, websiteUrl: null };

    const found = await call(() => getSite(host));
    if (!found) return { state: "not-monitored" as const, access, websiteUrl };
    return { state: "ok" as const, access, websiteUrl, site: found.site, uptime: found.uptime };
  }),

  /** Open problems (muted ones carry ignoredAt). */
  problems: cmsProcedure.query(async ({ ctx }) => {
    const host = await requireHost(ctx.projectId);
    return call(() => listIncidents(host));
  }),

  pages: cmsProcedure.query(async ({ ctx }) => {
    const host = await requireHost(ctx.projectId);
    return call(() => getPages(host));
  }),

  endpoints: cmsProcedure.query(async ({ ctx }) => {
    const host = await requireHost(ctx.projectId);
    return call(() => getEndpoints(host));
  }),

  /** Check history, newest first. */
  history: cmsProcedure.query(async ({ ctx }) => {
    const host = await requireHost(ctx.projectId);
    return call(() => listRuns(host, 30));
  }),

  /**
   * Starts monitoring. With `websiteUrl`, saves it on the project first
   * (owner or admin only, like project.setWebsiteUrl), so a project with no
   * domain gets one and is monitored in one step.
   */
  connect: cmsFullAccessProcedure
    .input(z.object({ websiteUrl: z.string().trim().max(255).optional() }))
    .mutation(async ({ ctx, input }) => {
      let websiteUrl = await projectWebsite(ctx.projectId);

      if (input.websiteUrl) {
        const next = normalizeWebsiteUrl(input.websiteUrl);
        if (!next) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Enter the live website, e.g. www.example.com" });
        }
        if (next !== websiteUrl) {
          if (!(await isProjectOwnerOrAdmin(ctx.user, ctx.projectId))) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only the project owner or an admin can change the website address.",
            });
          }
          await db.update(hubProject).set({ websiteUrl: next }).where(eq(hubProject.id, ctx.projectId));
          websiteUrl = next;
        }
      }

      const host = websiteUrl ? siteHost(websiteUrl) : null;
      if (!websiteUrl || !host) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Add your website address first." });
      }

      return call(async () => {
        // Already monitored (maybe as www/apex): nothing to add.
        if (await getSite(host)) return { websiteUrl, created: false };
        await createSite(websiteUrl);
        return { websiteUrl, created: true };
      });
    }),

  runCheck: cmsWriteProcedure.mutation(async ({ ctx }) => {
    await rateLimit(RUN_LIMIT.max, RUN_LIMIT.windowMs, `${RUN_LIMIT.scope}:${ctx.projectId}`);
    const host = await requireHost(ctx.projectId);
    return call(() => runCheck(host));
  }),

  setMuted: cmsWriteProcedure
    .input(z.object({ incidentId: z.string().uuid(), muted: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const host = await requireHost(ctx.projectId);
      await call(() => setIncidentMuted(host, input.incidentId, input.muted));
      return { ok: true };
    }),
});
