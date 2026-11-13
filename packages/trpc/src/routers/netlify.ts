import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

import { cmsFullAccessProcedure, cmsProcedure, createTRPCRouter } from "../init";
import { latestNetlifyDeploy } from "../lib/content-pilot";
import {
  deployProjectToNetlify,
  getNetlifySite,
  listNetlifyDeploys,
  netlifyTokenFor,
} from "../lib/netlify";

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

export const netlifyRouter = createTRPCRouter({
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
});
