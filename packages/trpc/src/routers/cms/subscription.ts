import { TRPCError } from "@trpc/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import Stripe from "stripe";
import z from "zod";

import {
  adminProcedure,
  authenticatedProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import { stripe } from "@workspace/trpc/lib/stripe";
import { db } from "@workspace/drizzle/index";
import { hubProject, hubSubscription } from "@workspace/drizzle/schema";

import { toTRPCError } from "@workspace/trpc/lib/cms/errors";
import { refreshFeatureAccess } from "@workspace/trpc/lib/cms/feature-access";
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
    .input(z.object({ feature: z.enum(featureKeys) }))
    .mutation(async ({ input, ctx }) => {
      try {
        const hasAccess = await refreshFeatureAccess(
          ctx.session.user,
          input.feature
        );

        return { hasAccess };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),

  // The per-project subscription row (or null) for the Billing tab. Drives the
  // products-vs-manage-vs-free-life branch.
  getProject: authenticatedProcedure
    .input(z.object({ owner: z.string().optional(), repo: z.string() }))
    .query(async ({ input }) => {
      const org = input.owner ?? process.env.GITHUB_ORG;
      if (!org) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Missing owner" });
      }
      const [project] = await db
        .select({ repoId: hubProject.repoId, freeLife: hubProject.freeLife })
        .from(hubProject)
        .where(
          and(
            sql`lower(${hubProject.owner}) = lower(${org})`,
            sql`lower(${hubProject.repo}) = lower(${input.repo})`
          )
        )
        .limit(1);
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }
      const [row] = await db
        .select()
        .from(hubSubscription)
        .where(eq(hubSubscription.repoId, project.repoId))
        .limit(1);
      return {
        repoId: project.repoId,
        freeLife: project.freeLife,
        subscription: row ?? null,
      };
    }),

  // Batch fetch for the home gallery plan badges — one query, not N.
  listForRepos: authenticatedProcedure
    .input(z.object({ repoIds: z.array(z.number().int().positive()).max(200) }))
    .query(async ({ input }) => {
      if (input.repoIds.length === 0)
        return [] as (typeof hubSubscription.$inferSelect)[];
      return db
        .select()
        .from(hubSubscription)
        .where(inArray(hubSubscription.repoId, input.repoIds));
    }),

  // Batch plan lookup for the home gallery, keyed by (owner, repo) so the caller
  // doesn't need repoId. Joins hubProject -> hubSubscription; projects without a
  // row are simply absent (the gallery treats those as "No plan").
  listForProjects: authenticatedProcedure
    .input(
      z.object({
        projects: z
          .array(z.object({ owner: z.string(), repo: z.string() }))
          .max(200),
      })
    )
    .query(async ({ input }) => {
      if (input.projects.length === 0)
        return [] as {
          owner: string;
          repo: string;
          plan: string | null;
          status: string | null;
          freeLife: boolean;
        }[];

      const owners = [
        ...new Set(input.projects.map((p) => p.owner.toLowerCase())),
      ];
      const wanted = new Set(
        input.projects.map(
          (p) => `${p.owner.toLowerCase()}/${p.repo.toLowerCase()}`
        )
      );

      // Base on hubProject (leftJoin the subscription) so free-for-life projects
      // without a subscription row still surface for the gallery badge.
      const rows = await db
        .select({
          owner: hubProject.owner,
          repo: hubProject.repo,
          plan: hubSubscription.plan,
          status: hubSubscription.status,
          freeLife: hubProject.freeLife,
        })
        .from(hubProject)
        .leftJoin(hubSubscription, eq(hubSubscription.repoId, hubProject.repoId))
        .where(inArray(sql`lower(${hubProject.owner})`, owners));

      return rows.filter((r) =>
        wanted.has(`${r.owner.toLowerCase()}/${r.repo.toLowerCase()}`)
      );
    }),

  // Invoices for a project, scoped to that project's Stripe customer.
  getInvoices: authenticatedProcedure
    .input(z.object({ repoId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const [row] = await db
        .select({ stripeCustomerId: hubSubscription.stripeCustomerId })
        .from(hubSubscription)
        .where(eq(hubSubscription.repoId, input.repoId))
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
    .mutation(async ({ input }) => {
      const [row] = await db
        .select({ stripeCustomerId: hubSubscription.stripeCustomerId })
        .from(hubSubscription)
        .where(eq(hubSubscription.repoId, input.repoId))
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

  // Admin: grant a free / free-for-life plan (no Stripe subscription), or reset.
  setPlan: adminProcedure
    .input(
      z.object({
        repoId: z.number().int().positive(),
        plan: z.enum(["free", "free_lifetime", "paid"]),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .insert(hubSubscription)
        .values({ repoId: input.repoId, plan: input.plan })
        .onConflictDoUpdate({
          target: hubSubscription.repoId,
          set: { plan: input.plan, updatedAt: new Date() },
        });
      return { ok: true };
    }),
});
