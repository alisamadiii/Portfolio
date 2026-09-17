import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

import {
  cmsFullAccessProcedure,
  cmsProcedure,
  createTRPCRouter,
} from "../init";
import {
  getGoogleAccessToken,
  listGa4Properties,
  RECONNECT,
  runGa4Report,
} from "../lib/ga";

// Per-client Google Analytics. Project-level connection: whoever connects
// stores their user id + the chosen GA4 property on hub_project, and every
// report call uses THAT user's stored Google token — so any viewer of the tab
// sees data without linking their own Google account.

async function resolveProject(owner: string | undefined, repo: string) {
  const org = owner ?? process.env.GITHUB_ORG;
  if (!org) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Missing owner" });
  }
  const [row] = await db
    .select({
      gaPropertyId: hubProject.gaPropertyId,
      gaConnectedUserId: hubProject.gaConnectedUserId,
    })
    .from(hubProject)
    .where(
      sql`lower(${hubProject.owner}) = lower(${org}) and lower(${hubProject.repo}) = lower(${repo})`
    )
    .limit(1);
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }
  return row;
}

const ownerRepoWhere = (owner: string | undefined, repo: string) => {
  const org = owner ?? process.env.GITHUB_ORG;
  return sql`lower(${hubProject.owner}) = lower(${org}) and lower(${hubProject.repo}) = lower(${repo})`;
};

const RANGES = { "7d": 7, "28d": 28, "90d": 90 } as const;

export const analyticsRouter = createTRPCRouter({
  // Cheap gate for the Analytics tab — connected → dashboard, else setup card.
  status: cmsProcedure.query(async ({ input }) => {
    const project = await resolveProject(input.owner, input.repo);
    return {
      connected: !!(project.gaPropertyId && project.gaConnectedUserId),
      propertyId: project.gaPropertyId,
    };
  }),

  // GA4 properties the CALLER's freshly-linked Google account can read —
  // powers the property dropdown right after the consent flow.
  properties: cmsFullAccessProcedure.query(async ({ ctx }) => {
    const token = await getGoogleAccessToken(ctx.user.id);
    return listGa4Properties(token);
  }),

  // Bind a property to the project. The caller becomes the connected user
  // whose token future reports run under.
  connect: cmsFullAccessProcedure
    .input(z.object({ propertyId: z.string().regex(/^\d+$/) }))
    .mutation(async ({ ctx, input }) => {
      // Verify the caller's token can actually see this property before saving.
      const token = await getGoogleAccessToken(ctx.user.id);
      const properties = await listGa4Properties(token);
      if (!properties.some((p) => p.propertyId === input.propertyId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your Google account has no access to that property.",
        });
      }
      await db
        .update(hubProject)
        .set({ gaPropertyId: input.propertyId, gaConnectedUserId: ctx.user.id })
        .where(ownerRepoWhere(input.owner, input.repo));
      return { ok: true };
    }),

  disconnect: cmsFullAccessProcedure.mutation(async ({ input }) => {
    await db
      .update(hubProject)
      .set({ gaPropertyId: null, gaConnectedUserId: null })
      .where(ownerRepoWhere(input.owner, input.repo));
    return { ok: true };
  }),

  report: cmsProcedure
    .input(z.object({ range: z.enum(["7d", "28d", "90d"]).default("28d") }))
    .query(async ({ input }) => {
      const project = await resolveProject(input.owner, input.repo);
      if (!project.gaPropertyId || !project.gaConnectedUserId) {
        throw RECONNECT();
      }
      const token = await getGoogleAccessToken(project.gaConnectedUserId);
      return runGa4Report(token, project.gaPropertyId, {
        startDate: `${RANGES[input.range]}daysAgo`,
        endDate: "today",
      });
    }),
});
