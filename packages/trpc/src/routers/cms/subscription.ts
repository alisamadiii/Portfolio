import { TRPCError } from "@trpc/server";
import z from "zod";

import {
  authenticatedProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";

import { toTRPCError } from "@workspace/trpc/lib/cms/errors";
import { refreshFeatureAccess } from "@workspace/trpc/lib/cms/feature-access";
import { toCmsUser } from "@workspace/trpc/lib/cms/session-user";
import { featureKeys } from "@workspace/trpc/lib/features";

/**
 * Fresh (uncached) subscription check for a gated feature. Called after the
 * user reports a purchase — busts the cached Stripe data so the next save
 * attempt sees the new subscription immediately.
 * Port of POST /api/subscription/[feature]/refresh.
 */
const refresh = authenticatedProcedure
  .input(z.object({ feature: z.enum(featureKeys) }))
  .mutation(async ({ input, ctx }) => {
    try {
      const hasAccess = await refreshFeatureAccess(
        toCmsUser(ctx.session.user),
        input.feature
      );

      return { hasAccess };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  });

const subscriptionRouter = createTRPCRouter({
  refresh,
});

export { subscriptionRouter };
