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
  isNotNull,
  lt,
  ne,
  or,
  sql,
  sum,
} from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/pool";
import {
  AGENCY_LEAD_CHANNEL_VALUES,
  AGENCY_LEAD_STATUS_VALUES,
  agencyClient,
  agencyLead,
  agencyWeeklyReport,
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
import { ADS_TTL, cachedAds, invalidateAds, ttlForRange } from "../lib/agency/ads-cache";
import { getAvailability } from "../lib/agency/booking";
import {
  BOOKING_MINUTES,
  MAX_RANGE_DAYS,
  bookingSettingsSchema,
  isValidSlot,
} from "../lib/agency/booking-slots";
import {
  BOOKING_SCOPES,
  CALENDAR_SCOPE,
  getConnectedAccount,
} from "../lib/integrations";
import {
  deleteLeadMeeting,
  moveBookingEvent,
} from "../lib/integrations/calendar";
import { getAccountAlerts, wiredActions } from "../lib/agency/account-alerts";
import { budgetPacing } from "../lib/agency/budget-pacing";
import {
  EDITABLE_CATEGORIES,
  MANAGED_TYPES,
  buildUpdate,
  findPreset,
  planPreset,
} from "../lib/agency/conversion-presets";
import {
  reportLeadStage,
  reportLeadStages,
  syncConversionUploads,
} from "../lib/agency/conversion-uploads";
import { enrichAdClicks } from "../lib/agency/enrich-ad-clicks";
import type { WeeklyReportData } from "../lib/agency/weekly-report";
import { classifyLead } from "../lib/agency/lead-channel";
import {
  addNegativeKeyword,
  createConversionActions,
  getAdsStats,
  getBudgetPacing,
  getConversionActions,
  getSearchTerms,
  getUploadHealth,
  listCampaigns,
  GoogleAdsError,
  listConversionActionNames,
  isGoogleAdsConfigured,
  listConversionActions,
  listManagedAccounts,
  normalizeCustomerId,
  removeConversionAction,
  setCampaignBudget,
  updateConversionAction,
  uploadConversion,
} from "../lib/google-ads";
import { syntheticRepoId } from "../lib/cms/upload-slug";
import { normalizeOrigin } from "../lib/agency/origins";

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
    await requireFeature(user, input.repoId, "leads");

    // Found by repoId, so the website is linked here.
    return next({ ctx: { ...ctx, client: { ...client, repoId: input.repoId }, role } });
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
    const { requestId } = await uploadConversion({
      customerId: client.googleAdsCustomerId,
      conversionAction: client.googleAdsConversionAction,
      valueCents: lead.valueCents,
      currency: lead.currency,
      convertedAt: lead.wonAt ?? new Date(),
      transactionId: `lead-${lead.id}-won`,
      gclid: lead.gclid,
      gbraid: lead.gbraid,
      wbraid: lead.wbraid,
      email: lead.email,
      phone: lead.phone,
    });
    await db
      .update(agencyLead)
      .set({
        conversionUploadedAt: new Date(),
        conversionError: null,
        // The async verify pass confirms the records with this request id.
        adsUploads: sql`coalesce(${agencyLead.adsUploads}, '{}'::jsonb) || ${JSON.stringify(
          { won: { at: new Date().toISOString(), ...(requestId && { requestId }) } }
        )}::jsonb`,
      })
      .where(eq(agencyLead.id, lead.id));
  } catch (error) {
    await db
      .update(agencyLead)
      .set({ conversionError: errorMessage(error) })
      .where(eq(agencyLead.id, lead.id));
  }
}

// Rows captured before channels existed are classified on read.
const withChannel = <T extends typeof agencyLead.$inferSelect>(lead: T) => ({
  ...lead,
  channel: lead.channel ?? classifyLead({ ...lead, siteHost: hostOf(lead.pageUrl) }),
});

const hostOf = (url: string | null) => {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

const getLead = async (repoId: number, id: number) => {
  const lead = await db.query.agencyLead.findFirst({
    where: and(eq(agencyLead.id, id), eq(agencyLead.repoId, repoId)),
  });
  if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });
  return withChannel(lead);
};

// Leads with no stored channel count as direct in SQL breakdowns (the backfill
// script sets them; this only covers rows it hasn't reached).
const channelExpr = sql<string>`coalesce(${agencyLead.channel}, 'direct')`;

const dateRange = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const leadsRouter = createTRPCRouter({
  list: agencyProcedure
    .input(
      z.object({
        status: z.enum(AGENCY_LEAD_STATUS_VALUES).optional(),
        channel: z.enum(AGENCY_LEAD_CHANNEL_VALUES).optional(),
        search: z.string().trim().max(200).optional(),
        campaignId: z.string().regex(/^\d+$/).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(25),
      })
    )
    .query(async ({ ctx, input }) => {
      if (input.page === 1) {
        await Promise.all([enrichAdClicks(ctx.client), syncConversionUploads(ctx.client)]);
      }
      const where = and(
        eq(agencyLead.repoId, ctx.client.repoId),
        // Only leads whose ad click was matched to this campaign.
        input.campaignId
          ? sql`${agencyLead.adClick}->>'campaignId' = ${input.campaignId}`
          : undefined,
        // Spam stays out of the inbox unless asked for.
        input.status ? eq(agencyLead.status, input.status) : ne(agencyLead.status, "spam"),
        input.channel ? sql`${channelExpr} = ${input.channel}` : undefined,
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

      return { rows: rows.map(withChannel), total };
    }),

  get: agencyProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(({ ctx, input }) => getLead(ctx.client.repoId, input.id)),

  // Counts, won value and leads per day for a date range (inclusive, UTC).
  stats: agencyProcedure
    .input(dateRange.extend({ campaignId: z.string().regex(/^\d+$/).optional() }))
    .query(async ({ ctx, input }) => {
    await Promise.all([enrichAdClicks(ctx.client), syncConversionUploads(ctx.client)]);
    const from = new Date(`${input.from}T00:00:00Z`);
    const to = new Date(`${input.to}T00:00:00Z`);
    to.setUTCDate(to.getUTCDate() + 1);

    // Only leads whose ad click was matched to this campaign.
    const campaignFilter = input.campaignId
      ? sql`${agencyLead.adClick}->>'campaignId' = ${input.campaignId}`
      : undefined;
    const inRange = and(
      eq(agencyLead.repoId, ctx.client.repoId),
      campaignFilter,
      gte(agencyLead.createdAt, from),
      lt(agencyLead.createdAt, to)
    );

    const notSpam = and(inRange, ne(agencyLead.status, "spam"));
    const wonInRange = and(
      eq(agencyLead.repoId, ctx.client.repoId),
      campaignFilter,
      eq(agencyLead.status, "won"),
      gte(agencyLead.wonAt, from),
      lt(agencyLead.wonAt, to)
    );
    const campaignId = sql<string>`${agencyLead.adClick}->>'campaignId'`;
    const keyword = sql<string>`${agencyLead.adClick}->>'keyword'`;
    const landing = sql<string>`split_part(split_part(${agencyLead.landingPage}, '?', 1), '#', 1)`;

    const [byChannelLeads, byChannelWon, byDayChannel, byCampaign, byKeyword, landingPages] =
      await Promise.all([
        db
          .select({ channel: channelExpr, count: count() })
          .from(agencyLead)
          .where(notSpam)
          .groupBy(sql`1`),
        db
          .select({ channel: channelExpr, count: count(), valueCents: sum(agencyLead.valueCents) })
          .from(agencyLead)
          .where(wonInRange)
          .groupBy(sql`1`),
        db
          .select({
            date: sql<string>`to_char(${agencyLead.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`,
            channel: channelExpr,
            count: count(),
          })
          .from(agencyLead)
          .where(notSpam)
          .groupBy(sql`1`, sql`2`)
          .orderBy(sql`1`),
        db
          .select({
            campaignId,
            campaignName: sql<string>`max(${agencyLead.adClick}->>'campaignName')`,
            leads: count(),
            won: sql<number>`count(*) filter (where ${agencyLead.status} = 'won')`.mapWith(Number),
            wonValueCents: sql<number>`coalesce(sum(${agencyLead.valueCents}) filter (where ${agencyLead.status} = 'won'), 0)`.mapWith(Number),
          })
          .from(agencyLead)
          .where(and(notSpam, sql`${campaignId} is not null`))
          .groupBy(campaignId),
        db
          .select({
            keyword,
            matchType: sql<string>`max(${agencyLead.adClick}->>'matchType')`,
            leads: count(),
            won: sql<number>`count(*) filter (where ${agencyLead.status} = 'won')`.mapWith(Number),
          })
          .from(agencyLead)
          .where(and(notSpam, sql`${keyword} is not null`))
          .groupBy(keyword)
          .orderBy(desc(count()))
          .limit(20),
        db
          .select({ page: landing, leads: count() })
          .from(agencyLead)
          .where(and(notSpam, isNotNull(agencyLead.landingPage)))
          .groupBy(landing)
          .orderBy(desc(count()))
          .limit(10),
      ]);

    const wonByChannel = new Map(byChannelWon.map((row) => [row.channel, row]));
    const byChannel = byChannelLeads.map((row) => ({
      channel: row.channel as (typeof AGENCY_LEAD_CHANNEL_VALUES)[number],
      leads: row.count,
      won: wonByChannel.get(row.channel)?.count ?? 0,
      wonValueCents: Number(wonByChannel.get(row.channel)?.valueCents ?? 0),
    }));
    // Won deals whose lead came in before the range still belong to a channel.
    for (const row of byChannelWon) {
      if (!byChannel.some((c) => c.channel === row.channel)) {
        byChannel.push({
          channel: row.channel as (typeof AGENCY_LEAD_CHANNEL_VALUES)[number],
          leads: 0,
          won: row.count,
          wonValueCents: Number(row.valueCents ?? 0),
        });
      }
    }

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
        .where(wonInRange),
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
      byChannel,
      byDayChannel: byDayChannel.map((row) => ({
        ...row,
        channel: row.channel as (typeof AGENCY_LEAD_CHANNEL_VALUES)[number],
      })),
      byCampaign,
      byKeyword,
      landingPages,
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
          channel: "manual",
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

      await Promise.all([
        reportWonLead(ctx.client, lead!),
        reportLeadStage(ctx.client, lead!, "qualified"),
      ]);
      return getLead(ctx.client.repoId, current.id);
    }),

  retryConversion: agencyWriteProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const lead = await getLead(ctx.client.repoId, input.id);
      await Promise.all([reportWonLead(ctx.client, lead), reportLeadStages(ctx.client, lead)]);
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
        weeklyReport: agencyClient.weeklyReport,
        email: userTable.email,
        name: userTable.name,
        repo: hubProject.repo,
        subscriptionStatus: subscriptions.status,
        subscriptionPriceId: subscriptions.priceId,
      })
      .from(agencyClient)
      .innerJoin(userTable, eq(userTable.id, agencyClient.userId))
      .leftJoin(hubProject, eq(hubProject.repoId, agencyClient.repoId))
      .leftJoin(
        subscriptions,
        eq(sql`${subscriptions.metadata} ->> 'repoId'`, sql`${agencyClient.repoId}::text`)
      )
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

  // Hub users matching an email or name, for the client picker.
  searchUsers: adminProcedure
    .input(z.object({ query: z.string().trim().max(200) }))
    .query(async ({ input }) => {
      const pattern = `%${input.query}%`;
      return db
        .select({
          id: userTable.id,
          email: userTable.email,
          name: userTable.name,
          agencyClientId: agencyClient.id,
        })
        .from(userTable)
        .leftJoin(agencyClient, eq(agencyClient.userId, userTable.id))
        .where(
          input.query
            ? or(ilike(userTable.email, pattern), ilike(userTable.name, pattern))
            : undefined
        )
        .orderBy(desc(userTable.createdAt))
        .limit(20);
    }),

  // Client accounts under the agency MCC, with the agency client using each.
  adsAccounts: adminProcedure.query(async () => {
    if (!isGoogleAdsConfigured()) return [];
    let accounts;
    try {
      accounts = await cachedAds(
        normalizeCustomerId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? ""),
        "accounts",
        ADS_TTL.live,
        listManagedAccounts
      );
    } catch (error) {
      throw new TRPCError({ code: "BAD_GATEWAY", message: errorMessage(error) });
    }
    const used = await db
      .select({ customerId: agencyClient.googleAdsCustomerId, email: userTable.email })
      .from(agencyClient)
      .innerJoin(userTable, eq(userTable.id, agencyClient.userId));
    const usedBy = new Map(used.map((row) => [row.customerId, row.email]));
    return accounts.map((account) => ({ ...account, usedBy: usedBy.get(account.id) ?? null }));
  }),

  // Make a user an agency client, or update their website and Ads wiring.
  // The website is optional: a new client may not have one until it's built.
  upsertClient: adminProcedure
    .input(
      z.object({
        email: z.string().trim().email(),
        repoId: z.number().int().positive().nullable(),
        googleAdsCustomerId: z.string().trim().max(20).nullable(),
        googleAdsConversionAction: z.string().trim().max(200).nullable(),
        leadNotifyEmail: z.string().trim().email().nullable().or(z.literal("")),
        weeklyReport: z.boolean(),
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
      if (input.repoId) {
        const project = await db.query.hubProject.findFirst({
          where: eq(hubProject.repoId, input.repoId),
        });
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Website not found." });
        }
        const taken = await db.query.agencyClient.findFirst({
          where: and(eq(agencyClient.repoId, input.repoId), ne(agencyClient.userId, owner.id)),
        });
        if (taken) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That website already belongs to another agency client.",
          });
        }
      }

      // Every client needs a tenant id for leads/booking/entitlement. Use the
      // linked website's repoId when given, otherwise keep the existing one, or
      // mint a standalone synthetic id for a website-less client.
      const existing = await db.query.agencyClient.findFirst({
        where: eq(agencyClient.userId, owner.id),
        columns: { repoId: true },
      });
      const repoId =
        input.repoId ?? existing?.repoId ?? syntheticRepoId();

      const values = {
        userId: owner.id,
        repoId,
        googleAdsCustomerId: input.googleAdsCustomerId
          ? normalizeCustomerId(input.googleAdsCustomerId)
          : null,
        googleAdsConversionAction: input.googleAdsConversionAction || null,
        leadNotifyEmail: input.leadNotifyEmail || null,
        weeklyReport: input.weeklyReport,
      };

      const [client] = await db
        .insert(agencyClient)
        .values({ ...values, formKey: randomBytes(12).toString("base64url") })
        .onConflictDoUpdate({ target: agencyClient.userId, set: values })
        .returning();
      return client!;
    }),

  // Stripe payment link for the Launch plan ($300 setup + $1,200/mo). Paying
  // it creates the project's subscription (webhook keys it on metadata.repoId)
  // and switches the client to the agency UI. Payment links never expire, so
  // it is safe to email. Promotion codes are allowed.
  createPaymentLink: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const prices = pricesFor("agency:launch");
      if (!prices) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Agency Launch prices are not set for this Stripe mode (lib/payment/plans.ts).",
        });
      }
      const client = await db.query.agencyClient.findFirst({
        where: eq(agencyClient.id, input.id),
      });
      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agency client not found." });
      }
      // The subscription is keyed on the website, so it has to exist first.
      if (!client.repoId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Link a website to this client before creating a payment link.",
        });
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
        // Stripe fills {CHECKOUT_SESSION_ID}; the hub's welcome page verifies it.
        after_completion: {
          type: "redirect",
          redirect: { url: `${urls.cms}/agency/success?session_id={CHECKOUT_SESSION_ID}` },
        },
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

// ─── Marketing > Conversions ─────────────────────────────────────
// The client's Google Ads conversion actions: list, presets, add, edit,
// delete, and which lead stage our server reports to each one.

const conversionsProcedure = agencyProcedure.use(async ({ next, ctx }) => {
  await requireFeature(ctx.session.user, ctx.client.repoId, "ads");
  return next({ ctx });
});

// Changing the client's Ads account is limited to people with full access.
const conversionsManageProcedure = conversionsProcedure.use(async ({ next, ctx }) => {
  if (ctx.role !== "full-access") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the account owner can change conversion actions." });
  }
  const customerId = ctx.client.googleAdsCustomerId;
  if (!customerId || !isGoogleAdsConfigured()) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No Google Ads account is linked yet." });
  }
  return next({ ctx: { ...ctx, customerId } });
});

const stageInput = z.enum(["lead", "booking", "qualified", "won"]);

const actionFields = z.object({
  name: z.string().trim().min(1).max(100),
  category: z.enum(EDITABLE_CATEGORIES as [string, ...string[]]),
  countingType: z.enum(["ONE_PER_CLICK", "MANY_PER_CLICK"]),
  clickThroughLookbackWindowDays: z.number().int().min(1).max(90),
  primaryForGoal: z.boolean(),
  defaultValue: z.number().min(0).max(1_000_000),
});

/** Point a lead stage at an action (or nothing); `calls` is only remembered. */
async function wireStage(
  client: typeof agencyClient.$inferSelect,
  stage: "lead" | "booking" | "qualified" | "won" | "calls",
  resourceName: string | null
) {
  if (stage === "won") {
    await db
      .update(agencyClient)
      .set({ googleAdsConversionAction: resourceName })
      .where(eq(agencyClient.id, client.id));
    return;
  }
  await db
    .update(agencyClient)
    .set({
      googleAdsActions: resourceName
        ? sql`coalesce(${agencyClient.googleAdsActions}, '{}'::jsonb) || ${JSON.stringify({ [stage]: resourceName })}::jsonb`
        : sql`coalesce(${agencyClient.googleAdsActions}, '{}'::jsonb) - ${stage}::text`,
    })
    .where(eq(agencyClient.id, client.id));
}

const adsError = (error: unknown) =>
  error instanceof TRPCError
    ? error
    : new TRPCError({ code: "BAD_GATEWAY", message: errorMessage(error) });

const conversionsRouter = createTRPCRouter({
  // Null when this client has no Google Ads account linked yet.
  list: conversionsProcedure.input(dateRange).query(async ({ ctx, input }) => {
    const customerId = ctx.client.googleAdsCustomerId;
    if (!customerId || !isGoogleAdsConfigured()) return null;

    const { actions, health } = await cachedAds(
      customerId,
      `conversions:v2:${input.from}:${input.to}`,
      ADS_TTL.live,
      async () => {
        const [actions, health] = await Promise.all([
          getConversionActions(customerId, input.from, input.to),
          // Google's upload pipeline report; empty for accounts without uploads.
          getUploadHealth(customerId).catch(() => []),
        ]);
        return { actions, health };
      }
    ).catch((error) => {
      throw adsError(error);
    });

    // Our own uploads, per stage: count and the latest one.
    const [uploads] = await db
      .select({
        lead: sql<number>`count(*) filter (where ${agencyLead.adsUploads} -> 'lead' ->> 'at' is not null and ${agencyLead.source} <> 'booking')`.mapWith(Number),
        leadAt: sql<string | null>`max(${agencyLead.adsUploads} -> 'lead' ->> 'at') filter (where ${agencyLead.source} <> 'booking')`,
        // Bookings share the "lead" upload stage but report to their own action.
        booking: sql<number>`count(*) filter (where ${agencyLead.adsUploads} -> 'lead' ->> 'at' is not null and ${agencyLead.source} = 'booking')`.mapWith(Number),
        bookingAt: sql<string | null>`max(${agencyLead.adsUploads} -> 'lead' ->> 'at') filter (where ${agencyLead.source} = 'booking')`,
        qualified: sql<number>`count(*) filter (where ${agencyLead.adsUploads} -> 'qualified' ->> 'at' is not null)`.mapWith(Number),
        qualifiedAt: sql<string | null>`max(${agencyLead.adsUploads} -> 'qualified' ->> 'at')`,
        won: sql<number>`count(${agencyLead.conversionUploadedAt})`.mapWith(Number),
        wonAt: sql<string | null>`max(${agencyLead.conversionUploadedAt})::text`,
      })
      .from(agencyLead)
      .where(eq(agencyLead.repoId, ctx.client.repoId));

    return {
      customerId,
      actions,
      health,
      wired: wiredActions(ctx.client),
      uploads: {
        lead: { count: uploads?.lead ?? 0, lastAt: uploads?.leadAt ?? null },
        booking: { count: uploads?.booking ?? 0, lastAt: uploads?.bookingAt ?? null },
        qualified: { count: uploads?.qualified ?? 0, lastAt: uploads?.qualifiedAt ?? null },
        won: { count: uploads?.won ?? 0, lastAt: uploads?.wonAt ?? null },
      },
      canManage: ctx.role === "full-access",
    };
  }),

  // Idempotent: reuses actions with the same names, creates the rest, wires them all.
  applyPreset: conversionsManageProcedure
    .input(z.object({ presetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const preset = findPreset(input.presetId);
      if (!preset) throw new TRPCError({ code: "NOT_FOUND", message: "Unknown preset." });
      try {
        const existing = await listConversionActionNames(ctx.customerId);
        const plan = planPreset(preset, existing);
        const created = await createConversionActions(ctx.customerId, plan.create);
        const wired = [
          ...plan.reuse,
          ...plan.create.map((action, i) => ({ key: action.key, resourceName: created[i]! })),
        ];
        for (const { key, resourceName } of wired) await wireStage(ctx.client, key, resourceName);
        await invalidateAds(ctx.customerId, "conversions:");
        return { created: plan.create.length, reused: plan.reuse.length };
      } catch (error) {
        throw adsError(error);
      }
    }),

  create: conversionsManageProcedure
    .input(
      actionFields.extend({
        type: z.enum(MANAGED_TYPES),
        stage: stageInput.nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { stage, ...spec } = input;
      try {
        const [resourceName] = await createConversionActions(ctx.customerId, [
          spec as Parameters<typeof createConversionActions>[1][number],
        ]);
        if (stage && resourceName && spec.type === "UPLOAD_CLICKS") {
          await wireStage(ctx.client, stage, resourceName);
        }
        await invalidateAds(ctx.customerId, "conversions:");
        return { resourceName };
      } catch (error) {
        throw adsError(error);
      }
    }),

  update: conversionsManageProcedure
    .input(
      z.object({
        resourceName: z.string(),
        before: actionFields,
        after: actionFields.partial(),
        // undefined = leave wiring alone, null = unwire.
        stage: stageInput.nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertOwnAction(ctx.customerId, input.resourceName);
      try {
        const update = buildUpdate(
          input.before as Parameters<typeof buildUpdate>[0],
          input.after as Parameters<typeof buildUpdate>[1]
        );
        if (update) await updateConversionAction(ctx.customerId, input.resourceName, update);
        if (input.stage !== undefined) {
          await unwireAction(ctx.client, input.resourceName);
          if (input.stage) await wireStage(ctx.client, input.stage, input.resourceName);
        }
        await invalidateAds(ctx.customerId, "conversions:");
      } catch (error) {
        throw adsError(error);
      }
    }),

  remove: conversionsManageProcedure
    .input(z.object({ resourceName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertOwnAction(ctx.customerId, input.resourceName);
      try {
        await removeConversionAction(ctx.customerId, input.resourceName);
        await unwireAction(ctx.client, input.resourceName);
        await invalidateAds(ctx.customerId, "conversions:");
      } catch (error) {
        throw adsError(error);
      }
    }),
});

// Only actions in this client's own account can be changed.
function assertOwnAction(customerId: string, resourceName: string) {
  if (!new RegExp(`^customers/${normalizeCustomerId(customerId)}/conversionActions/\\d+$`).test(resourceName)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown conversion action." });
  }
}

/** Stop reporting any stage to this action. */
async function unwireAction(client: typeof agencyClient.$inferSelect, resourceName: string) {
  const wired = wiredActions(client);
  for (const stage of ["lead", "booking", "qualified", "won", "calls"] as const) {
    if (wired[stage] === resourceName) await wireStage(client, stage, null);
  }
}

// ─── Booking ─────────────────────────────────────────────────────
// Appointment settings + the owner's view of bookings. Visitors book through
// the public widget endpoint (apps/api .../agency/booking/[formKey]); the
// calendar behind everything is the OWNER's Google account (client.userId),
// no matter which hub member manages the booking.

const SLOT_MS = BOOKING_MINUTES * 60 * 1000;

/** The lead must be a live booking belonging to this client. */
async function findBookingLead(repoId: number, leadId: number) {
  const lead = await db.query.agencyLead.findFirst({
    where: and(eq(agencyLead.id, leadId), eq(agencyLead.repoId, repoId)),
  });
  if (!lead || lead.source !== "booking" || !lead.bookingAt) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found." });
  }
  return lead;
}

const bookingRouter = createTRPCRouter({
  // Connection + settings in one call: what the booking page renders from.
  status: agencyProcedure.query(async ({ ctx }) => {
    const [booking, calendar] = await Promise.all([
      getConnectedAccount(ctx.client.userId, "google", BOOKING_SCOPES),
      getConnectedAccount(ctx.client.userId, "google", CALENDAR_SCOPE),
    ]);
    return {
      // Connected with both scopes (events + freebusy).
      connected: Boolean(booking),
      // Calendar linked before booking existed: one reconnect adds freebusy.
      needsReconnect: !booking && Boolean(calendar),
      settings: ctx.client.bookingSettings,
      formKey: ctx.role === "full-access" ? ctx.client.formKey : null,
    };
  }),

  setSettings: agencyWriteProcedure
    .input(z.object({ settings: bookingSettingsSchema.nullable() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(agencyClient)
        .set({ bookingSettings: input.settings })
        .where(eq(agencyClient.id, ctx.client.id));
    }),

  // Booked meetings, soonest first; recent past and canceled kept visible.
  list: agencyProcedure.query(async ({ ctx }) => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return db
      .select({
        id: agencyLead.id,
        name: agencyLead.name,
        email: agencyLead.email,
        phone: agencyLead.phone,
        notes: agencyLead.message,
        bookingAt: agencyLead.bookingAt,
        bookingEnd: agencyLead.bookingEnd,
        bookingCanceledAt: agencyLead.bookingCanceledAt,
        booking: agencyLead.booking,
        status: agencyLead.status,
        channel: agencyLead.channel,
      })
      .from(agencyLead)
      .where(
        and(
          eq(agencyLead.repoId, ctx.client.repoId),
          eq(agencyLead.source, "booking"),
          isNotNull(agencyLead.bookingAt),
          gte(agencyLead.bookingAt, since)
        )
      )
      .orderBy(desc(agencyLead.bookingAt))
      .limit(200);
  }),

  // Free slots for the hub's reschedule picker; same math as the widget.
  slots: agencyProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ ctx, input }) => {
      const settings = ctx.client.bookingSettings;
      const fromMs = Date.parse(input.from);
      const toMs = Date.parse(input.to);
      if (
        !settings ||
        !Number.isFinite(fromMs) ||
        !Number.isFinite(toMs) ||
        toMs <= fromMs ||
        toMs - fromMs > MAX_RANGE_DAYS * 24 * 60 * 60 * 1000
      ) {
        return { slots: [] };
      }
      const slots = await getAvailability({
        repoId: ctx.client.repoId,
        userId: ctx.client.userId,
        settings,
        fromMs,
        toMs,
      });
      return { slots };
    }),

  // Cancel: Google emails the visitor; the slot opens up again.
  cancel: agencyWriteProcedure
    .input(z.object({ leadId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const lead = await findBookingLead(ctx.client.repoId, input.leadId);
      if (lead.bookingCanceledAt) return;
      if (lead.booking?.eventId) {
        await deleteLeadMeeting({
          userId: ctx.client.userId,
          eventId: lead.booking.eventId,
        });
      }
      await db
        .update(agencyLead)
        .set({ bookingCanceledAt: new Date() })
        .where(eq(agencyLead.id, lead.id));
    }),

  // Reschedule: the event moves, Google notifies both sides.
  reschedule: agencyWriteProcedure
    .input(z.object({ leadId: z.number().int(), at: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const settings = ctx.client.bookingSettings;
      const lead = await findBookingLead(ctx.client.repoId, input.leadId);
      if (lead.bookingCanceledAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This booking was canceled." });
      }
      const atMs = Date.parse(input.at);
      if (
        !settings ||
        !Number.isFinite(atMs) ||
        atMs % SLOT_MS !== 0 ||
        !isValidSlot(new Date(atMs).toISOString(), settings, new Date())
      ) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That time is not available." });
      }
      const at = new Date(atMs);
      const end = new Date(atMs + SLOT_MS);
      try {
        await db
          .update(agencyLead)
          .set({
            bookingAt: at,
            bookingEnd: end,
            booking: {
              ...lead.booking,
              rescheduledFrom: lead.bookingAt!.toISOString(),
            },
          })
          .where(eq(agencyLead.id, lead.id));
      } catch (error) {
        // Unique (repo_id, booking_at): that slot is already booked.
        if ((error as { code?: string })?.code === "23505") {
          throw new TRPCError({ code: "CONFLICT", message: "That time was just taken." });
        }
        throw error;
      }
      if (lead.booking?.eventId) {
        await moveBookingEvent({
          userId: ctx.client.userId,
          eventId: lead.booking.eventId,
          startISO: at.toISOString(),
          endISO: end.toISOString(),
        });
      }
    }),
});

export const agencyRouter = createTRPCRouter({
  // Null unless the user's agency website has an active agency subscription:
  // the Hub then shows the website UI (project gallery) instead. Admins get
  // the agency UI for any client they're set up on, no subscription needed.
  me: authenticatedProcedure.query(async ({ ctx }) => {
    const membership = await findAgencyMembership(ctx.session.user);
    if (!membership) return null;

    const { client, role } = membership;
    // No website linked yet: the agency UI has nothing to show.
    const repoId = client.repoId;
    if (!repoId) return null;
    const entitlement = await getEntitlement(repoId);
    if (entitlement.product !== "agency" && !isAdminUser(ctx.session.user)) {
      return null;
    }
    const project = await db.query.hubProject.findFirst({
      where: eq(hubProject.repoId, repoId),
      columns: { owner: true, repo: true, websiteUrl: true },
    });

    return {
      repoId,
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

  booking: bookingRouter,

  // Domains the client's capture + booking scripts are allowed to run on.
  origins: createTRPCRouter({
    get: agencyProcedure.query(({ ctx }) => ctx.client.origins ?? []),
    set: agencyWriteProcedure
      .input(z.object({ origins: z.array(z.string().trim().max(253)).max(50) }))
      .mutation(async ({ ctx, input }) => {
        // Store bare hostnames, deduped; drop anything without a host.
        const cleaned = [
          ...new Set(
            input.origins
              .map((o) => normalizeOrigin(o))
              .filter((h): h is string => Boolean(h))
          ),
        ];
        await db
          .update(agencyClient)
          .set({ origins: cleaned })
          .where(eq(agencyClient.id, ctx.client.id));
        return cleaned;
      }),
  }),

  // Saved copies of the Monday report emails, newest week first.
  reports: createTRPCRouter({
    list: agencyProcedure.query(async ({ ctx }) => {
      await requireFeature(ctx.session.user, ctx.client.repoId, "leads");
      const rows = await db
        .select()
        .from(agencyWeeklyReport)
        .where(eq(agencyWeeklyReport.repoId, ctx.client.repoId))
        .orderBy(desc(agencyWeeklyReport.weekFrom))
        .limit(52);
      return rows.map((row) => ({
        id: row.id,
        weekFrom: row.weekFrom,
        emailedAt: row.emailedAt,
        data: row.data as WeeklyReportData,
      }));
    }),
  }),

  ads: createTRPCRouter({
    // Null when this client has no Google Ads account linked yet.
    stats: agencyProcedure
      .input(dateRange.extend({ campaignId: z.string().regex(/^\d+$/).optional() }))
      .query(async ({ ctx, input }) => {
        await requireFeature(ctx.session.user, ctx.client.repoId, "ads");
        if (!ctx.client.googleAdsCustomerId || !isGoogleAdsConfigured()) return null;
        try {
          const customerId = ctx.client.googleAdsCustomerId;
          return await cachedAds(
            customerId,
            `stats:${input.from}:${input.to}:${input.campaignId ?? "all"}`,
            ttlForRange(input.to),
            () => getAdsStats(customerId, input.from, input.to, input.campaignId)
          );
        } catch (error) {
          throw new TRPCError({ code: "BAD_GATEWAY", message: errorMessage(error) });
        }
      }),

    budget: createTRPCRouter({
      // Null when no account linked. Pacing needs a target set on this page.
      get: conversionsProcedure.query(async ({ ctx }) => {
        const customerId = ctx.client.googleAdsCustomerId;
        if (!customerId || !isGoogleAdsConfigured()) return null;
        try {
          const data = await cachedAds(customerId, "budget", ADS_TTL.live, () =>
            getBudgetPacing(customerId)
          );
          const targetCents = ctx.client.googleAdsBudget?.monthlyCents ?? null;
          return {
            ...data,
            targetCents,
            pacing: budgetPacing(data.spentCents, targetCents, new Date()),
            canManage: ctx.role === "full-access",
          };
        } catch (error) {
          throw adsError(error);
        }
      }),

      setTarget: conversionsManageProcedure
        .input(
          z.object({
            monthlyCents: z.number().int().min(100).max(100_000_000).nullable(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          await db
            .update(agencyClient)
            .set({
              googleAdsBudget: input.monthlyCents
                ? { monthlyCents: input.monthlyCents }
                : null,
            })
            .where(eq(agencyClient.id, ctx.client.id));
          // Pacing alerts depend on the target.
          await invalidateAds(ctx.customerId, "alerts");
        }),

      setCampaignBudget: conversionsManageProcedure
        .input(
          z.object({
            budgetResourceName: z
              .string()
              .regex(/^customers\/\d+\/campaignBudgets\/\d+$/),
            dailyBudgetCents: z.number().int().min(100).max(100_000_000),
          })
        )
        .mutation(async ({ ctx, input }) => {
          if (
            !input.budgetResourceName.startsWith(
              `customers/${normalizeCustomerId(ctx.customerId)}/`
            )
          ) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "That budget belongs to another account.",
            });
          }
          try {
            await setCampaignBudget(
              ctx.customerId,
              input.budgetResourceName,
              input.dailyBudgetCents
            );
          } catch (error) {
            throw adsError(error);
          }
          await Promise.all([
            invalidateAds(ctx.customerId, "budget"),
            invalidateAds(ctx.customerId, "alerts"),
          ]);
        }),
    }),

    searchTerms: createTRPCRouter({
      // Null when no account linked.
      list: conversionsProcedure
        .input(
          dateRange.extend({ campaignId: z.string().regex(/^\d+$/).optional() })
        )
        .query(async ({ ctx, input }) => {
          const customerId = ctx.client.googleAdsCustomerId;
          if (!customerId || !isGoogleAdsConfigured()) return null;
          try {
            const rows = await cachedAds(
              customerId,
              `searchTerms:${input.from}:${input.to}:${input.campaignId ?? "all"}`,
              ttlForRange(input.to),
              () => getSearchTerms(customerId, input.from, input.to, input.campaignId)
            );
            return { rows, canManage: ctx.role === "full-access" };
          } catch (error) {
            throw adsError(error);
          }
        }),

      exclude: conversionsManageProcedure
        .input(
          z.object({
            campaignId: z.string().regex(/^\d+$/),
            term: z.string().trim().min(1).max(80),
            matchType: z.enum(["EXACT", "PHRASE"]),
          })
        )
        .mutation(async ({ ctx, input }) => {
          try {
            await addNegativeKeyword(
              ctx.customerId,
              input.campaignId,
              input.term,
              input.matchType
            );
          } catch (error) {
            throw adsError(error);
          }
          await invalidateAds(ctx.customerId, "searchTerms:");
        }),
    }),

    // Health checks across budget, conversions, ads and uploads. Empty when
    // nothing needs attention; null when no account is linked. Cached 15 min.
    // Health checks shared with the weekly report email (lib/agency/account-alerts).
    alerts: conversionsProcedure.query(({ ctx }) => getAccountAlerts(ctx.client)),

    // Light list for the sidebar campaign filter. Null when no account linked.
    campaigns: agencyProcedure.query(async ({ ctx }) => {
      await requireFeature(ctx.session.user, ctx.client.repoId, "ads");
      const customerId = ctx.client.googleAdsCustomerId;
      if (!customerId || !isGoogleAdsConfigured()) return null;
      try {
        return await cachedAds(customerId, "campaigns", ADS_TTL.live, () =>
          listCampaigns(customerId)
        );
      } catch (error) {
        throw new TRPCError({ code: "BAD_GATEWAY", message: errorMessage(error) });
      }
    }),

    conversions: conversionsRouter,
  }),

  admin: adminRouter,
});
