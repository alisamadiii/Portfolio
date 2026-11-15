import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import Stripe from "stripe";
import z from "zod";

import {
  authenticatedProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import { stripe } from "@workspace/trpc/lib/payment/stripe";
import { db } from "@workspace/drizzle/index";
import { hubProject, subscriptions } from "@workspace/drizzle/schema";

import {
  assertProjectAccess,
  assertProjectOwnerOrAdmin,
  assertRepoAccessByProjectId,
  isProjectOwnerOrAdmin,
} from "@workspace/trpc/lib/cms/authz";
import { toTRPCError } from "@workspace/trpc/lib/cms/errors";
import { ALLOWED_ORIGINS } from "@workspace/trpc/lib/allow-origin";
import { isAdminUser } from "@workspace/trpc/lib/authz-shared";
import { listCatalog } from "@workspace/trpc/lib/client-websites-payments";
import {
  cancelOpenOffer,
  createOffer,
  offerItemsSchema,
  openOffer,
  publicOffer,
} from "@workspace/trpc/lib/payment/offers";

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

// Billing portal return URL: only back to one of our own apps.
const isOwnUrl = (value: string) => {
  try {
    return ALLOWED_ORIGINS.includes(new URL(value).origin);
  } catch {
    return false;
  }
};

export const subscriptionRouter = createTRPCRouter({
  // The per-project subscription row (or null) for the Billing tab. Drives the
  // products-vs-manage branch.
  getProject: authenticatedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const [project] = await db
        .select({
          projectId: hubProject.id,
          githubConnectedUserId: hubProject.githubConnectedUserId,
        })
        .from(hubProject)
        .where(eq(hubProject.id, input.projectId))
        .limit(1);
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }
      await assertProjectAccess(ctx.session.user, project);
      const [row] = await db
        .select({
          status: subscriptions.status,
          cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
        })
        .from(subscriptions)
        .where(eq(sql`${subscriptions.metadata} ->> 'projectId'`, String(project.projectId)))
        .limit(1);
      return {
        projectId: project.projectId,
        subscription: row ?? null,
        // Invoices and the Stripe portal belong to the owner's Stripe
        // customer (shared across their projects): owner or admin only.
        canManage: await isProjectOwnerOrAdmin(ctx.session.user, project.projectId),
      };
    }),

  // Invoices for a project, scoped to that project's Stripe customer.
  getInvoices: authenticatedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      await assertProjectOwnerOrAdmin(ctx.session.user, input.projectId);
      const [row] = await db
        .select({
          id: subscriptions.id,
          stripeCustomerId: subscriptions.stripeCustomerId,
        })
        .from(subscriptions)
        .where(eq(sql`${subscriptions.metadata} ->> 'projectId'`, String(input.projectId)))
        .limit(1);
      if (!row?.stripeCustomerId || !row.id.startsWith("sub_")) return [];
      // This project's subscription only, not every invoice of the customer.
      const invoices = await stripe.invoices.list({
        customer: row.stripeCustomerId,
        subscription: row.id,
        limit: 50,
      });
      return invoices.data.map(mapInvoice);
    }),

  // The project's open client plan (admin-built), or null. Shown to the client
  // on Billing with a "Complete billing" link; there is no public plan.
  offer: authenticatedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      await assertRepoAccessByProjectId(ctx.session.user, input.projectId);
      const offer = await openOffer(input.projectId);
      return offer ? publicOffer(offer) : null;
    }),

  // Admin: build a client plan for this project and get its checkout URL.
  // Replaces any open one (the old link stops working).
  createOffer: authenticatedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        name: z.string().trim().min(1).max(120),
        items: offerItemsSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!isAdminUser(ctx.session.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admins only." });
      }
      try {
        return publicOffer(await createOffer({ ...input, createdBy: ctx.session.user.id }));
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  cancelOffer: authenticatedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      if (!isAdminUser(ctx.session.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admins only." });
      }
      return { canceled: await cancelOpenOffer(input.projectId) };
    }),

  // Admin: the Stripe catalog the plan builder picks from (same list as the
  // client-websites Payment dialog).
  offerCatalog: authenticatedProcedure.query(async ({ ctx }) => {
    if (!isAdminUser(ctx.session.user)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admins only." });
    }
    return listCatalog();
  }),

  // Stripe billing portal for a project's customer.
  createPortalSession: authenticatedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        returnUrl: z.string().refine(isOwnUrl, "Invalid return URL"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertProjectOwnerOrAdmin(ctx.session.user, input.projectId);
      const [row] = await db
        .select({ stripeCustomerId: subscriptions.stripeCustomerId })
        .from(subscriptions)
        .where(eq(sql`${subscriptions.metadata} ->> 'projectId'`, String(input.projectId)))
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
