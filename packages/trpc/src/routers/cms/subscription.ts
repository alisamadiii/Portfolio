import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import z from "zod";

import {
  authenticatedProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import { stripe } from "@workspace/trpc/lib/stripe";
import { db } from "@workspace/drizzle/index";
import { hubProject, subscriptions } from "@workspace/drizzle/schema";

import {
  assertProjectAccess,
  assertRepoAccessByRepoId,
} from "@workspace/trpc/lib/cms/authz";
import { toTRPCError } from "@workspace/trpc/lib/cms/errors";
import {
  refreshFeatureAccess,
  refreshProjectPlan,
} from "@workspace/trpc/lib/cms/feature-access";
import { featureKeys } from "@workspace/trpc/lib/features";

const mapInvoice = (inv: Stripe.Invoice) => ({
  id: inv.id,
  number: inv.number,
  status: inv.status,
  amountPaid: inv.amount_paid,
  amountDue: inv.amount_due,
  currency: inv.currency,
  created: inv.created,
  hostedInvoiceUrl: inv.hosted_invoice_url,
  invoicePdf: inv.invoice_pdf,
  lineItems: (inv.lines?.data ?? []).map((line) => ({
    id: line.id,
    description: line.description,
    amount: line.amount,
    currency: line.currency,
    quantity: line.quantity,
  })),
});

export const subscriptionRouter = createTRPCRouter({
  /**
   * Fresh (uncached) subscription check for a gated feature. Called after the
   * user reports a purchase — busts the cached Stripe data so the next save
   * attempt sees the new subscription immediately.
   * Port of POST /api/subscription/[feature]/refresh.
   */
  refresh: authenticatedProcedure
    .input(
      z.object({
        feature: z.enum(featureKeys),
        // Per-project plan: when present, check the project's own
        // subscription row (fresh DB read) instead of the per-email path.
        repoId: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const hasAccess = input.repoId
          ? await refreshProjectPlan(ctx.session.user, input.repoId)
          : await refreshFeatureAccess(ctx.session.user, input.feature);

        return { hasAccess };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),

  // The per-project subscription row (or null) for the Billing tab. Drives the
  // products-vs-manage-vs-free-life branch.
  getProject: authenticatedProcedure
    .input(z.object({ repoId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const [project] = await db
        .select({
          repoId: hubProject.repoId,
          freeLife: hubProject.freeLife,
          githubConnectedUserId: hubProject.githubConnectedUserId,
        })
        .from(hubProject)
        .where(eq(hubProject.repoId, input.repoId))
        .limit(1);
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }
      await assertProjectAccess(ctx.session.user, project);
      const [row] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.repoId, project.repoId))
        .limit(1);
      return {
        repoId: project.repoId,
        freeLife: project.freeLife,
        subscription: row ?? null,
      };
    }),

  // Invoices for a project, scoped to that project's Stripe customer.
  getInvoices: authenticatedProcedure
    .input(z.object({ repoId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await assertRepoAccessByRepoId(ctx.session.user, input.repoId);
      const [row] = await db
        .select({ stripeCustomerId: subscriptions.stripeCustomerId })
        .from(subscriptions)
        .where(eq(subscriptions.repoId, input.repoId))
        .limit(1);
      if (!row?.stripeCustomerId) return [];
      const invoices = await stripe.invoices.list({
        customer: row.stripeCustomerId,
        limit: 50,
      });
      return invoices.data.map(mapInvoice);
    }),

  // Stripe billing portal for a project's customer.
  createPortalSession: authenticatedProcedure
    .input(
      z.object({
        repoId: z.number().int().positive(),
        returnUrl: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertRepoAccessByRepoId(ctx.session.user, input.repoId);
      const [row] = await db
        .select({ stripeCustomerId: subscriptions.stripeCustomerId })
        .from(subscriptions)
        .where(eq(subscriptions.repoId, input.repoId))
        .limit(1);
      if (!row?.stripeCustomerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No Stripe customer for this project",
        });
      }
      const session = await stripe.billingPortal.sessions.create({
        customer: row.stripeCustomerId,
        return_url: input.returnUrl,
      });
      return { url: session.url };
    }),
});
