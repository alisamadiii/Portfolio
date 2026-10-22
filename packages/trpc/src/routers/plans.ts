import { TRPCError } from "@trpc/server";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

import {
  authenticatedProcedure,
  collaboratorProcedure,
  createTRPCRouter,
} from "../init";
import { accessibleProjectsWhere } from "../lib/cms/accessible-projects";
import { assertRepoAccessByRepoId } from "../lib/cms/authz";
import { toTRPCError } from "../lib/cms/errors";
import { getEntitlement, getEntitlements } from "../lib/payment/entitlements";
import type { Entitlement } from "../lib/payment/plans";

// Plans: what each project the caller can access is entitled to (tier,
// features, limits). The hub caches plans.mine in usePlans and gates every
// screen on it; procedures enforce the same catalog with requireFeature.
export const plansRouter = createTRPCRouter({
  // One Entitlement per accessible project. Projects without a live
  // subscription come back as website:free.
  mine: collaboratorProcedure.query(async ({ ctx }): Promise<Entitlement[]> => {
    try {
      const projects = await db
        .select({ repoId: hubProject.repoId })
        .from(hubProject)
        .where(accessibleProjectsWhere(ctx));
      return await getEntitlements(projects.map((p) => p.repoId));
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  }),

  // Fresh read for one project, used right after checkout to confirm the
  // webhook has landed.
  project: authenticatedProcedure
    .input(z.object({ repoId: z.number().int().positive() }))
    .query(async ({ ctx, input }): Promise<Entitlement> => {
      await assertRepoAccessByRepoId(ctx.session.user, input.repoId);
      return getEntitlement(input.repoId);
    }),
});
