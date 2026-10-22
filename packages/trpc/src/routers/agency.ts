import { randomBytes } from "crypto";

import { TRPCError } from "@trpc/server";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lt,
  ne,
  or,
  sql,
  sum,
} from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/pool";
import {
  AGENCY_LEAD_STATUS_VALUES,
  agencyClient,
  agencyLead,
  hubProject,
  subscriptions,
  user as userTable,
  type CollaboratorRole,
} from "@workspace/drizzle/schema";

import { stripe } from "@workspace/trpc/lib/payment/stripe";
import { urls } from "@workspace/ui/lib/company";

import {
  adminProcedure,
  authenticatedProcedure,
  createTRPCRouter,
} from "../init";
import { isAdminUser, roleAtLeast } from "../lib/authz-shared";
import { collaboratorMatchesUser } from "../lib/cms/collaborator-access";
import { getEntitlement, requireFeature } from "../lib/payment/entitlements";
import { planForPrice, pricesFor } from "../lib/payment/plans";
import {
  getAdsStats,
  GoogleAdsError,
  isGoogleAdsConfigured,
  listConversionActions,
  normalizeCustomerId,
  uploadClosedDeal,
} from "../lib/google-ads";

// ─── Lead-generation agency ──────────────────────────────────────
// Agency clients see the agency UI in the Hub: their one website, the leads
// its forms capture (POST /api/agency/forms/[formKey] on apps/api), and their
// Google Ads results. Closing a lead as won reports it back to Google Ads.

type SessionUser = { id: string; email: string; role?: string | null };

/** The agency client the user belongs to (owner first, then collaborator), with their role. */
async function findAgencyMembership(user: SessionUser) {
  const owned = await db.query.agencyClient.findFirst({
    where: eq(agencyClient.userId, user.id),
  });
  if (owned) return { client: owned, role: "full-access" as CollaboratorRole };

  const collaborations = await db.query.hubCollaborator.findMany({
    where: collaboratorMatchesUser(user),
    columns: { repoId: true, role: true },
  });
  const repoIds = collaborations.flatMap((c) => (c.repoId ? [c.repoId] : []));
  if (!repoIds.length) return null;

  const client = await db.query.agencyClient.findFirst({
    where: inArray(agencyClient.repoId, repoIds),
  });
  if (!client) return null;

  const role = collaborations.find((c) => c.repoId === client.repoId)!.role;
  return { client, role };
}

// Agency-scoped: requires `repoId`, resolves the caller's role on that agency
// client from the DB only (no GitHub token needed, unlike cmsProcedure).
const agencyProcedure = authenticatedProcedure
  .input(z.object({ repoId: z.number().int().positive() }))
  .use(async ({ next, ctx, input }) => {
    const user = ctx.session.user;
    const client = await db.query.agencyClient.findFirst({
      where: eq(agencyClient.repoId, input.repoId),
    });
    if (!client) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Agency client not found." });
    }

    let role: CollaboratorRole | null = null;
    if (isAdminUser(user) || client.userId === user.id) {
      role = "full-access";
    } else {
      const membership = await findAgencyMembership(user);
      if (membership?.client.id === client.id) role = membership.role;
    }
    if (!role) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No access to this account." });
    }
    // Every agency screen is built on leads; the plan catalog decides who has them.
    await requireFeature(user, client.repoId, "leads");

    return next({ ctx: { ...ctx, client, role } });
  });

const agencyWriteProcedure = agencyProcedure.use(async ({ next, ctx }) => {
  if (!roleAtLeast(ctx.role, "content-editor")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You have view-only access." });
  }
  return next({ ctx });
});

const errorMessage = (error: unknown) =>
  error instanceof GoogleAdsError || error instanceof Error
    ? error.message
    : "Upload failed.";

/**
 * Upload a won lead as a closed-deal conversion and record the outcome on the
 * row. Never throws: a failed upload is shown on the lead with a retry button.
 */
async function reportWonLead(
  client: typeof agencyClient.$inferSelect,
  lead: typeof agencyLead.$inferSelect
) {
  if (lead.status !== "won" || !lead.valueCents || lead.conversionUploadedAt) return;
  if (!client.googleAdsCustomerId || !client.googleAdsConversionAction) return;
  if (!isGoogleAdsConfigured()) return;

  try {
    await uploadClosedDeal({
      customerId: client.googleAdsCustomerId,
      conversionAction: client.googleAdsConversionAction,
      valueCents: lead.valueCents,
      currency: lead.currency,
      convertedAt: lead.wonAt ?? new Date(),
      gclid: lead.gclid,
      gbraid: lead.gbraid,
      wbraid: lead.wbraid,
      email: lead.email,
      phone: lead.phone,
    });
    await db
      .update(agencyLead)
      .set({ conversionUploadedAt: new Date(), conversionError: null })
      .where(eq(agencyLead.id, lead.id));
  } catch (error) {
    await db
      .update(agencyLead)
      .set({ conversionError: errorMessage(error) })
      .where(eq(agencyLead.id, lead.id));
  }
}

const getLead = async (repoId: number, id: number) => {
  const lead = await db.query.agencyLead.findFirst({
    where: and(eq(agencyLead.id, id), eq(agencyLead.repoId, repoId)),
  });
  if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });
  return lead;
};

const dateRange = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const leadsRouter = createTRPCRouter({
  list: agencyProcedure
    .input(
      z.object({
        status: z.enum(AGENCY_LEAD_STATUS_VALUES).optional(),
        search: z.string().trim().max(200).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(25),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = and(
        eq(agencyLead.repoId, ctx.client.repoId),
        // Spam stays out of the inbox unless asked for.
        input.status ? eq(agencyLead.status, input.status) : ne(agencyLead.status, "spam"),
        input.search
          ? or(
              ilike(agencyLead.name, `%${input.search}%`),
              ilike(agencyLead.email, `%${input.search}%`),
              ilike(agencyLead.phone, `%${input.search}%`)
            )
          : undefined
      );

      const [rows, [{ total }]] = await Promise.all([
        db
          .select()
          .from(agencyLead)
          .where(where)
          .orderBy(desc(agencyLead.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize),
        db.select({ total: count() }).from(agencyLead).where(where),
      ]);

      return { rows, total };
    }),

  get: agencyProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(({ ctx, input }) => getLead(ctx.client.repoId, input.id)),

  // Counts, won value and leads per day for a date range (inclusive, UTC).
  stats: agencyProcedure.input(dateRange).query(async ({ ctx, input }) => {
    const from = new Date(`${input.from}T00:00:00Z`);
    const to = new Date(`${input.to}T00:00:00Z`);
    to.setUTCDate(to.getUTCDate() + 1);

    const inRange = and(
      eq(agencyLead.repoId, ctx.client.repoId),
      gte(agencyLead.createdAt, from),
      lt(agencyLead.createdAt, to)
    );

    const [byStatus, byDay, [won]] = await Promise.all([
      db
        .select({ status: agencyLead.status, count: count() })
        .from(agencyLead)
        .where(inRange)
        .groupBy(agencyLead.status),
      db
        .select({
          date: sql<string>`to_char(${agencyLead.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`,
          count: count(),
        })
        .from(agencyLead)
        .where(and(inRange, ne(agencyLead.status, "spam")))
        .groupBy(sql`1`)
        .orderBy(sql`1`),
      // Won value counts by when the deal closed, not when the lead came in.
      db
        .select({ count: count(), valueCents: sum(agencyLead.valueCents) })
        .from(agencyLead)
        .where(
          and(
            eq(agencyLead.repoId, ctx.client.repoId),
            eq(agencyLead.status, "won"),
            gte(agencyLead.wonAt, from),
            lt(agencyLead.wonAt, to)
          )
        ),
    ]);

    const counts = Object.fromEntries(byStatus.map((row) => [row.status, row.count]));
    const leads = byStatus
      .filter((row) => row.status !== "spam")
      .reduce((total, row) => total + row.count, 0);

    return {
      leads,
      counts,
      won: won?.count ?? 0,
      wonValueCents: Number(won?.valueCents ?? 0),
      byDay,
    };
  }),

  create: agencyWriteProcedure
    .input(
      z.object({
        name: z.string().trim().max(200).optional(),
        email: z.string().trim().email().max(320).optional().or(z.literal("")),
        phone: z.string().trim().max(50).optional(),
        message: z.string().trim().max(5000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [lead] = await db
        .insert(agencyLead)
        .values({
          repoId: ctx.client.repoId,
          source: "manual",
          name: input.name || null,
          email: input.email || null,
          phone: input.phone || null,
          message: input.message || null,
        })
        .returning();
      return lead!;
    }),

  update: agencyWriteProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(AGENCY_LEAD_STATUS_VALUES).optional(),
        valueCents: z.number().int().min(0).nullable().optional(),
        notes: z.string().max(10_000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const current = await getLead(ctx.client.repoId, input.id);

      const status = input.status ?? current.status;
      const becameWon = status === "won" && current.status !== "won";
      const leftWon = status !== "won" && current.status === "won";

      const [lead] = await db
        .update(agencyLead)
        .set({
          status,
          ...(input.valueCents !== undefined && { valueCents: input.valueCents }),
          ...(input.notes !== undefined && { notes: input.notes }),
          ...(becameWon && { wonAt: new Date() }),
          ...(leftWon && { wonAt: null }),
        })
        .where(eq(agencyLead.id, current.id))
        .returning();

      await reportWonLead(ctx.client, lead!);
      return getLead(ctx.client.repoId, current.id);
    }),

  retryConversion: agencyWriteProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await reportWonLead(ctx.client, await getLead(ctx.client.repoId, input.id));
      return getLead(ctx.client.repoId, input.id);
    }),
});

const adminRouter = createTRPCRouter({
  listClients: adminProcedure.query(() =>
    db
      .select({
        id: agencyClient.id,
        repoId: agencyClient.repoId,
        formKey: agencyClient.formKey,
        googleAdsCustomerId: agencyClient.googleAdsCustomerId,
        googleAdsConversionAction: agencyClient.googleAdsConversionAction,
        leadNotifyEmail: agencyClient.leadNotifyEmail,
        email: userTable.email,
        name: userTable.name,
        repo: hubProject.repo,
        subscriptionStatus: subscriptions.status,
        subscriptionPriceId: subscriptions.priceId,
      })
      .from(agencyClient)
      .innerJoin(userTable, eq(userTable.id, agencyClient.userId))
      .leftJoin(hubProject, eq(hubProject.repoId, agencyClient.repoId))
      .leftJoin(subscriptions, eq(subscriptions.repoId, agencyClient.repoId))
      .orderBy(desc(agencyClient.createdAt))
      .then((rows) =>
        rows.map(({ subscriptionStatus, subscriptionPriceId, ...row }) => ({
          ...row,
          // The agency plan is what switches the client to the agency UI.
          agencyPlanStatus: planForPrice(subscriptionPriceId)?.startsWith("agency:")
            ? subscriptionStatus
            : null,
        }))
      )
  ),

  // Make a user an agency client of one website, or update their Ads wiring.
  upsertClient: adminProcedure
    .input(
      z.object({
        email: z.string().trim().email(),
        repoId: z.number().int().positive(),
        googleAdsCustomerId: z.string().trim().max(20).nullable(),
        googleAdsConversionAction: z.string().trim().max(200).nullable(),
        leadNotifyEmail: z.string().trim().email().nullable().or(z.literal("")),
      })
    )
    .mutation(async ({ input }) => {
      const owner = await db.query.user.findFirst({
        where: sql`lower(${userTable.email}) = lower(${input.email})`,
      });
      if (!owner) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No Hub account with that email. Have them sign up first.",
        });
      }
      const project = await db.query.hubProject.findFirst({
        where: eq(hubProject.repoId, input.repoId),
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Website not found." });
      }

      const values = {
        userId: owner.id,
        repoId: input.repoId,
        googleAdsCustomerId: input.googleAdsCustomerId
          ? normalizeCustomerId(input.googleAdsCustomerId)
          : null,
        googleAdsConversionAction: input.googleAdsConversionAction || null,
        leadNotifyEmail: input.leadNotifyEmail || null,
      };

      const [client] = await db
        .insert(agencyClient)
        .values({ ...values, formKey: randomBytes(12).toString("base64url") })
        .onConflictDoUpdate({ target: agencyClient.repoId, set: values })
        .returning();
      return client!;
    }),

  // Stripe payment link for the Launch plan ($300 setup + $1,200/mo). Paying
  // it creates the project's subscription (webhook keys it on metadata.repoId)
  // and switches the client to the agency UI. Payment links never expire, so
  // it is safe to email. Promotion codes are allowed.
  createPaymentLink: adminProcedure
    .input(z.object({ repoId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const prices = pricesFor("agency:launch");
      if (!prices) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Agency Launch prices are not set for this Stripe mode (lib/payment/plans.ts).",
        });
      }
      const client = await db.query.agencyClient.findFirst({
        where: eq(agencyClient.repoId, input.repoId),
      });
      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agency client not found." });
      }

      const metadata = {
        plan: "agency-launch",
        repoId: String(client.repoId),
        userId: client.userId,
      };
      const link = await stripe.paymentLinks.create({
        line_items: [
          { price: prices.recurring, quantity: 1 },
          ...(prices.setup ? [{ price: prices.setup, quantity: 1 }] : []),
        ],
        metadata,
        subscription_data: { metadata },
        allow_promotion_codes: true,
        after_completion: { type: "redirect", redirect: { url: urls.cms } },
      });
      return { url: link.url };
    }),

  removeClient: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.delete(agencyClient).where(eq(agencyClient.id, input.id));
    }),

  conversionActions: adminProcedure
    .input(z.object({ customerId: z.string().trim().min(1) }))
    .query(async ({ input }) => {
      try {
        return await listConversionActions(input.customerId);
      } catch (error) {
        throw new TRPCError({ code: "BAD_GATEWAY", message: errorMessage(error) });
      }
    }),
});

export const agencyRouter = createTRPCRouter({
  // Null unless the user's agency website has an active agency subscription:
  // the Hub then shows the website UI (project gallery) instead.
  me: authenticatedProcedure.query(async ({ ctx }) => {
    const membership = await findAgencyMembership(ctx.session.user);
    if (!membership) return null;

    const { client, role } = membership;
    const entitlement = await getEntitlement(client.repoId);
    if (entitlement.product !== "agency") return null;
    const project = await db.query.hubProject.findFirst({
      where: eq(hubProject.repoId, client.repoId),
      columns: { owner: true, repo: true, websiteUrl: true },
    });

    return {
      repoId: client.repoId,
      role,
      owner: project?.owner ?? "",
      repo: project?.repo ?? "",
      websiteUrl: project?.websiteUrl ?? null,
      adsConnected: Boolean(client.googleAdsCustomerId),
      // Only people who can edit the site need the install snippet.
      formKey: role === "full-access" ? client.formKey : null,
    };
  }),

  leads: leadsRouter,

  ads: createTRPCRouter({
    // Null when this client has no Google Ads account linked yet.
    stats: agencyProcedure.input(dateRange).query(async ({ ctx, input }) => {
      await requireFeature(ctx.session.user, ctx.client.repoId, "ads");
      if (!ctx.client.googleAdsCustomerId || !isGoogleAdsConfigured()) return null;
      try {
        return await getAdsStats(ctx.client.googleAdsCustomerId, input.from, input.to);
      } catch (error) {
        throw new TRPCError({ code: "BAD_GATEWAY", message: errorMessage(error) });
      }
    }),
  }),

  admin: adminRouter,
});
