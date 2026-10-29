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
  isNull,
  lt,
  ne,
  or,
  sql,
  sum,
} from "drizzle-orm";
import z from "zod";

import { urls } from "@workspace/ui/lib/company";

import { stripe } from "@workspace/trpc/lib/payment/stripe";
import { db } from "@workspace/drizzle/pool";
import {
  AGENCY_LEAD_CHANNEL_VALUES,
  AGENCY_LEAD_STATUS_VALUES,
  agencyClient,
  agencyLead,
  agencyWeeklyReport,
  hubCollaborator,
  hubProject,
  subscriptions,
  user as userTable,
  type AdCampaign,
  type CollaboratorRole,
} from "@workspace/drizzle/schema";

import {
  adminProcedure,
  authenticatedProcedure,
  createTRPCRouter,
} from "../init";
import { getAccountAlerts, wiredActions } from "../lib/agency/account-alerts";
import {
  ADS_TTL,
  cachedAds,
  invalidateAds,
  ttlForRange,
} from "../lib/agency/ads-cache";
import { getAvailability } from "../lib/agency/booking";
import {
  BOOKING_MINUTES,
  bookingSettingsSchema,
  isValidSlot,
  MAX_RANGE_DAYS,
} from "../lib/agency/booking-slots";
import { budgetPacing } from "../lib/agency/budget-pacing";
import {
  buildUpdate,
  EDITABLE_CATEGORIES,
  findPreset,
  MANAGED_TYPES,
  planPreset,
} from "../lib/agency/conversion-presets";
import {
  reportLeadStage,
  reportLeadStages,
  syncConversionUploads,
} from "../lib/agency/conversion-uploads";
import { enrichAdClicks } from "../lib/agency/enrich-ad-clicks";
import { classifyLead } from "../lib/agency/lead-channel";
import {
  INDUSTRIES,
  NEGATIVE_LIST_KEYS,
  SHARED_SET_PREFIX,
  STARTER_NEGATIVE_LISTS,
  starterListByKey,
  type Industry,
  type NegativeListKey,
} from "../lib/agency/negative-lists";
import { normalizeOrigin } from "../lib/agency/origins";
import type { WeeklyReportData } from "../lib/agency/weekly-report";
import { isAdminUser, roleAtLeast } from "../lib/authz-shared";
import { collaboratorMatchesUser } from "../lib/cms/collaborator-access";
import { createStarterProject } from "../lib/cms/upload-project";
import {
  addNegativeKeyword,
  applySharedNegativeList,
  createConversionActions,
  getAdsStats,
  getBudgetPacing,
  getConversionActions,
  getLsaStats,
  getSearchTerms,
  getUploadHealth,
  GoogleAdsError,
  isGoogleAdsConfigured,
  listCampaigns,
  listConversionActionNames,
  listConversionActions,
  listLsaLeads,
  listManagedAccounts,
  listSharedNegativeSets,
  normalizeCustomerId,
  removeConversionAction,
  setCampaignBudget,
  updateConversionAction,
  uploadConversion,
} from "../lib/google-ads";
import {
  BOOKING_SCOPES,
  CALENDAR_SCOPE,
  getConnectedAccount,
} from "../lib/integrations";
import {
  deleteLeadMeeting,
  moveBookingEvent,
} from "../lib/integrations/calendar";
import { getEntitlement, requireFeature } from "../lib/payment/entitlements";
import { planForPrice, pricesFor } from "../lib/payment/plans";
import { ensureStripeCustomer } from "./payments";

// ─── Lead-generation agency ──────────────────────────────────────
// Agency clients see the agency UI in the Hub: their one website, the leads
// its forms capture (POST /api/agency/forms/[projectId] on apps/api), and their
// Google Ads results. Closing a lead as won reports it back to Google Ads.

type SessionUser = { id: string; email: string; role?: string | null };

/** The caller's role on one agency client: admin/owner, else a collaborator on its project. */
async function agencyRoleForClient(
  user: SessionUser,
  client: typeof agencyClient.$inferSelect
): Promise<CollaboratorRole | null> {
  if (isAdminUser(user) || client.userId === user.id) return "full-access";
  if (!client.projectId) return null;
  const collaboration = await db.query.hubCollaborator.findFirst({
    where: and(
      collaboratorMatchesUser(user),
      eq(hubCollaborator.projectId, client.projectId)
    ),
    columns: { role: true },
  });
  return collaboration?.role ?? null;
}

// Agency-scoped: requires `projectId`, resolves the caller's role on that agency
// client from the DB only (no GitHub token needed, unlike cmsProcedure).
const agencyProcedure = authenticatedProcedure
  .input(z.object({ projectId: z.string().uuid() }))
  .use(async ({ next, ctx, input }) => {
    const user = ctx.session.user;
    const client = await db.query.agencyClient.findFirst({
      where: eq(agencyClient.projectId, input.projectId),
    });
    if (!client) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Agency client not found.",
      });
    }

    const role = await agencyRoleForClient(user, client);
    if (!role) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "No access to this account.",
      });
    }
    // Every agency screen is built on leads; the plan catalog decides who has them.
    await requireFeature(user, input.projectId, "leads");

    // Found by projectId, so the website is linked here.
    return next({
      ctx: { ...ctx, client: { ...client, projectId: input.projectId }, role },
    });
  });

const agencyWriteProcedure = agencyProcedure.use(async ({ next, ctx }) => {
  if (!roleAtLeast(ctx.role, "content-editor")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You have view-only access.",
    });
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
  // valueCents == null (old rows): skipped until a value is entered; 0 uploads.
  if (
    lead.status !== "won" ||
    lead.valueCents == null ||
    lead.conversionUploadedAt
  )
    return;
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
          {
            won: {
              at: new Date().toISOString(),
              ...(requestId && { requestId }),
            },
          }
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
  channel:
    lead.channel ?? classifyLead({ ...lead, siteHost: hostOf(lead.pageUrl) }),
});

const hostOf = (url: string | null) => {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

const getLead = async (projectId: string, id: number) => {
  const lead = await db.query.agencyLead.findFirst({
    where: and(eq(agencyLead.id, id), eq(agencyLead.projectId, projectId)),
  });
  if (!lead)
    throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });
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
        await Promise.all([
          enrichAdClicks(ctx.client),
          syncConversionUploads(ctx.client),
        ]);
      }
      const where = and(
        eq(agencyLead.projectId, ctx.client.projectId),
        // Only leads whose ad click was matched to this campaign.
        input.campaignId
          ? sql`${agencyLead.adClick}->>'campaignId' = ${input.campaignId}`
          : undefined,
        // Spam stays out of the inbox unless asked for.
        input.status
          ? eq(agencyLead.status, input.status)
          : ne(agencyLead.status, "spam"),
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
    .query(({ ctx, input }) => getLead(ctx.client.projectId, input.id)),

  // Counts, won value and leads per day for a date range (inclusive, UTC).
  stats: agencyProcedure
    .input(
      dateRange.extend({ campaignId: z.string().regex(/^\d+$/).optional() })
    )
    .query(async ({ ctx, input }) => {
      await Promise.all([
        enrichAdClicks(ctx.client),
        syncConversionUploads(ctx.client),
      ]);
      const from = new Date(`${input.from}T00:00:00Z`);
      const to = new Date(`${input.to}T00:00:00Z`);
      to.setUTCDate(to.getUTCDate() + 1);

      // Only leads whose ad click was matched to this campaign.
      const campaignFilter = input.campaignId
        ? sql`${agencyLead.adClick}->>'campaignId' = ${input.campaignId}`
        : undefined;
      const inRange = and(
        eq(agencyLead.projectId, ctx.client.projectId),
        campaignFilter,
        gte(agencyLead.createdAt, from),
        lt(agencyLead.createdAt, to)
      );

      const notSpam = and(inRange, ne(agencyLead.status, "spam"));
      const wonInRange = and(
        eq(agencyLead.projectId, ctx.client.projectId),
        campaignFilter,
        eq(agencyLead.status, "won"),
        gte(agencyLead.wonAt, from),
        lt(agencyLead.wonAt, to)
      );
      const campaignId = sql<string>`${agencyLead.adClick}->>'campaignId'`;
      const keyword = sql<string>`${agencyLead.adClick}->>'keyword'`;
      const landing = sql<string>`split_part(split_part(${agencyLead.landingPage}, '?', 1), '#', 1)`;

      const [
        byChannelLeads,
        byChannelWon,
        byDayChannel,
        byCampaign,
        byKeyword,
        landingPages,
      ] = await Promise.all([
        db
          .select({ channel: channelExpr, count: count() })
          .from(agencyLead)
          .where(notSpam)
          .groupBy(sql`1`),
        db
          .select({
            channel: channelExpr,
            count: count(),
            valueCents: sum(agencyLead.valueCents),
          })
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
            won: sql<number>`count(*) filter (where ${agencyLead.status} = 'won')`.mapWith(
              Number
            ),
            wonValueCents:
              sql<number>`coalesce(sum(${agencyLead.valueCents}) filter (where ${agencyLead.status} = 'won'), 0)`.mapWith(
                Number
              ),
          })
          .from(agencyLead)
          .where(and(notSpam, sql`${campaignId} is not null`))
          .groupBy(campaignId),
        db
          .select({
            keyword,
            matchType: sql<string>`max(${agencyLead.adClick}->>'matchType')`,
            leads: count(),
            won: sql<number>`count(*) filter (where ${agencyLead.status} = 'won')`.mapWith(
              Number
            ),
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

      const wonByChannel = new Map(
        byChannelWon.map((row) => [row.channel, row])
      );
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

      // Bookings count by meeting time, not capture time; canceled ones drop out.
      const bookingInRange = and(
        eq(agencyLead.projectId, ctx.client.projectId),
        campaignFilter,
        eq(agencyLead.source, "booking"),
        isNull(agencyLead.bookingCanceledAt),
        gte(agencyLead.bookingAt, from),
        lt(agencyLead.bookingAt, to)
      );

      const [byStatus, byDay, [won], [bookings], [adQualifiedRow]] =
        await Promise.all([
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
          db
            .select({
              total: count(),
              fromAds:
                sql<number>`count(*) filter (where ${channelExpr} = 'google_ads')`.mapWith(
                  Number
                ),
              noShows:
                sql<number>`count(*) filter (where ${agencyLead.bookingOutcome} = 'no_show')`.mapWith(
                  Number
                ),
            })
            .from(agencyLead)
            .where(bookingInRange),
          db
            .select({ count: count() })
            .from(agencyLead)
            .where(
              and(
                notSpam,
                sql`${channelExpr} = 'google_ads'`,
                inArray(agencyLead.status, ["qualified", "won"])
              )
            ),
        ]);

      const counts = Object.fromEntries(
        byStatus.map((row) => [row.status, row.count])
      );
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
        bookings: {
          total: bookings?.total ?? 0,
          fromAds: bookings?.fromAds ?? 0,
          noShows: bookings?.noShows ?? 0,
        },
        adQualified: adQualifiedRow?.count ?? 0,
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
          projectId: ctx.client.projectId,
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
        lostReason: z.string().trim().max(500).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const current = await getLead(ctx.client.projectId, input.id);

      const status = input.status ?? current.status;
      const becameWon = status === "won" && current.status !== "won";
      const leftWon = status !== "won" && current.status === "won";

      // Every won lead needs a value (0 is fine) so it gets reported to Google.
      if (becameWon && (input.valueCents ?? current.valueCents) == null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "A deal value is required to mark a lead won. Enter 0 if there was no revenue.",
        });
      }

      const [lead] = await db
        .update(agencyLead)
        .set({
          status,
          ...(input.valueCents !== undefined && {
            valueCents: input.valueCents,
          }),
          ...(input.notes !== undefined && { notes: input.notes }),
          ...(becameWon && { wonAt: new Date() }),
          ...(leftWon && { wonAt: null }),
          // First time entering a status; set once, never cleared on revert.
          ...(status === "contacted" &&
            !current.contactedAt && { contactedAt: new Date() }),
          ...((status === "qualified" || status === "won") &&
            !current.qualifiedAt && { qualifiedAt: new Date() }),
          ...(status === "lost" && !current.lostAt && { lostAt: new Date() }),
          ...(input.lostReason !== undefined && {
            lostReason: input.lostReason,
          }),
        })
        .where(eq(agencyLead.id, current.id))
        .returning();

      await Promise.all([
        reportWonLead(ctx.client, lead!),
        reportLeadStage(ctx.client, lead!, "qualified"),
      ]);
      return getLead(ctx.client.projectId, current.id);
    }),

  retryConversion: agencyWriteProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const lead = await getLead(ctx.client.projectId, input.id);
      await Promise.all([
        reportWonLead(ctx.client, lead),
        reportLeadStages(ctx.client, lead),
      ]);
      return getLead(ctx.client.projectId, input.id);
    }),
});

const adminRouter = createTRPCRouter({
  listClients: adminProcedure.query(() =>
    db
      .select({
        id: agencyClient.id,
        projectId: agencyClient.projectId,
        industry: agencyClient.industry,
        adsType: agencyClient.adsType,
        googleAdsCustomerId: agencyClient.googleAdsCustomerId,
        googleAdsConversionAction: agencyClient.googleAdsConversionAction,
        weeklyReport: agencyClient.weeklyReport,
        email: userTable.email,
        name: userTable.name,
        repo: hubProject.repo,
        subscriptionStatus: subscriptions.status,
        subscriptionPriceId: subscriptions.priceId,
      })
      .from(agencyClient)
      .innerJoin(userTable, eq(userTable.id, agencyClient.userId))
      .leftJoin(hubProject, eq(hubProject.id, agencyClient.projectId))
      .leftJoin(
        subscriptions,
        eq(
          sql`${subscriptions.metadata} ->> 'projectId'`,
          sql`${agencyClient.projectId}::text`
        )
      )
      .orderBy(desc(agencyClient.createdAt))
      .then((rows) =>
        rows.map(({ subscriptionStatus, subscriptionPriceId, ...row }) => ({
          ...row,
          // The agency plan is what switches the client to the agency UI.
          agencyPlanStatus: planForPrice(subscriptionPriceId)?.startsWith(
            "agency:"
          )
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
          agencyCount: sql<number>`(select count(*)::int from ${agencyClient} where ${agencyClient.userId} = ${userTable.id})`,
        })
        .from(userTable)
        .where(
          input.query
            ? or(
                ilike(userTable.email, pattern),
                ilike(userTable.name, pattern)
              )
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
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: errorMessage(error),
      });
    }
    const used = await db
      .select({
        customerId: agencyClient.googleAdsCustomerId,
        email: userTable.email,
      })
      .from(agencyClient)
      .innerJoin(userTable, eq(userTable.id, agencyClient.userId));
    const usedBy = new Map(used.map((row) => [row.customerId, row.email]));
    return accounts.map((account) => ({
      ...account,
      usedBy: usedBy.get(account.id) ?? null,
    }));
  }),

  // Create an agency workspace on a project, or update one (by `id`). One user
  // can own many: each agency is its own project (projectId). No website yet →
  // a starter project (placeholder index.html) is created for the client.
  upsertClient: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive().nullable(),
        email: z.string().trim().email(),
        projectId: z.string().uuid().nullable(),
        // Starter project name when there's no website yet.
        businessName: z.string().trim().max(100).nullable(),
        industry: z.enum(INDUSTRIES).nullable(),
        adsType: z.enum(["search", "lsa", "both"]).nullable(),
        googleAdsCustomerId: z.string().trim().max(20).nullable(),
        googleAdsConversionAction: z.string().trim().max(200).nullable(),
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
      const existing = input.id
        ? await db.query.agencyClient.findFirst({
            where: eq(agencyClient.id, input.id),
          })
        : null;
      if (input.id && !existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agency client not found.",
        });
      }

      if (input.projectId) {
        const project = await db.query.hubProject.findFirst({
          where: eq(hubProject.id, input.projectId),
        });
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Website not found.",
          });
        }
        const taken = await db.query.agencyClient.findFirst({
          where: eq(agencyClient.projectId, input.projectId),
          columns: { id: true },
        });
        if (taken && taken.id !== existing?.id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That project already has an agency workspace.",
          });
        }
      }

      // Every agency lives in a project: the picked one, the current one, or
      // a fresh starter site.
      const projectId =
        input.projectId ??
        existing?.projectId ??
        (
          await createStarterProject({
            userId: owner.id,
            name: input.businessName || owner.name || "My business",
          })
        ).projectId;

      const values = {
        userId: owner.id,
        projectId,
        industry: input.industry,
        adsType: input.adsType,
        googleAdsCustomerId: input.googleAdsCustomerId
          ? normalizeCustomerId(input.googleAdsCustomerId)
          : null,
        googleAdsConversionAction: input.googleAdsConversionAction || null,
        weeklyReport: input.weeklyReport,
      };

      if (existing) {
        const [client] = await db
          .update(agencyClient)
          .set(values)
          .where(eq(agencyClient.id, existing.id))
          .returning();
        return client!;
      }
      const [client] = await db.insert(agencyClient).values(values).returning();
      return client!;
    }),

  // Admin Website ⇄ Agency switch: whether the project has an agency workspace
  // yet (switching to Agency without one creates it first).
  adminView: adminProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input }) => {
      const client = await db.query.agencyClient.findFirst({
        where: eq(agencyClient.projectId, input.projectId),
        columns: { id: true },
      });
      return { hasAgency: Boolean(client) };
    }),

  // Give a project an agency workspace from the admin switch. Idempotent; the
  // owner is whoever connected the project (the admin when unknown).
  enableForProject: adminProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.agencyClient.findFirst({
        where: eq(agencyClient.projectId, input.projectId),
      });
      if (existing) return existing;
      const project = await db.query.hubProject.findFirst({
        where: eq(hubProject.id, input.projectId),
        columns: { githubConnectedUserId: true },
      });
      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found.",
        });
      }
      const [client] = await db
        .insert(agencyClient)
        .values({
          userId: project.githubConnectedUserId ?? ctx.session.user.id,
          projectId: input.projectId,
          weeklyReport: false,
        })
        .onConflictDoNothing({ target: agencyClient.projectId })
        .returning();
      return (
        client ??
        (await db.query.agencyClient.findFirst({
          where: eq(agencyClient.projectId, input.projectId),
        }))!
      );
    }),

  // Stripe Checkout link for the Launch plan ($300 setup + $1,200/mo). Paying
  // it creates the project's subscription (webhook keys it on metadata.projectId)
  // and switches the client to the agency UI. The session is pinned to the
  // client's Stripe customer (matched or created by their hub email), so the
  // email at checkout is read-only — the payment can't land on a stranger.
  // Checkout sessions expire after 24 hours; generate a fresh link per send.
  createPaymentLink: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const prices = pricesFor("agency:launch");
      if (!prices) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Agency Launch prices are not set for this Stripe mode (lib/payment/plans.ts).",
        });
      }
      const [client] = await db
        .select({
          projectId: agencyClient.projectId,
          userId: agencyClient.userId,
          email: userTable.email,
          name: userTable.name,
        })
        .from(agencyClient)
        .innerJoin(userTable, eq(userTable.id, agencyClient.userId))
        .where(eq(agencyClient.id, input.id))
        .limit(1);
      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agency client not found.",
        });
      }
      const customerId = await ensureStripeCustomer({
        id: client.userId,
        email: client.email,
        name: client.name,
      });
      const metadata = {
        plan: "agency-launch",
        projectId: String(client.projectId),
        userId: client.userId,
      };
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [
          { price: prices.recurring, quantity: 1 },
          ...(prices.setup ? [{ price: prices.setup, quantity: 1 }] : []),
        ],
        metadata,
        subscription_data: { metadata },
        allow_promotion_codes: true,
        // Stripe fills {CHECKOUT_SESSION_ID}; the hub's welcome page verifies it.
        success_url: `${urls.cms}/agency/success?session_id={CHECKOUT_SESSION_ID}`,
      });
      if (!session.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Stripe did not return a checkout URL.",
        });
      }
      return { url: session.url };
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
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: errorMessage(error),
        });
      }
    }),
});

// ─── Marketing > Conversions ─────────────────────────────────────
// The client's Google Ads conversion actions: list, presets, add, edit,
// delete, and which lead stage our server reports to each one.

const conversionsProcedure = agencyProcedure.use(async ({ next, ctx }) => {
  await requireFeature(ctx.session.user, ctx.client.projectId, "ads");
  return next({ ctx });
});

// Changing the client's Ads account is limited to people with full access.
const conversionsManageProcedure = conversionsProcedure.use(
  async ({ next, ctx }) => {
    if (ctx.role !== "full-access") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only the account owner can change conversion actions.",
      });
    }
    const customerId = ctx.client.googleAdsCustomerId;
    if (!customerId || !isGoogleAdsConfigured()) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "No Google Ads account is linked yet.",
      });
    }
    return next({ ctx: { ...ctx, customerId } });
  }
);

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
        lead: sql<number>`count(*) filter (where ${agencyLead.adsUploads} -> 'lead' ->> 'at' is not null and ${agencyLead.source} <> 'booking')`.mapWith(
          Number
        ),
        leadAt: sql<
          string | null
        >`max(${agencyLead.adsUploads} -> 'lead' ->> 'at') filter (where ${agencyLead.source} <> 'booking')`,
        // Bookings share the "lead" upload stage but report to their own action.
        booking:
          sql<number>`count(*) filter (where ${agencyLead.adsUploads} -> 'lead' ->> 'at' is not null and ${agencyLead.source} = 'booking')`.mapWith(
            Number
          ),
        bookingAt: sql<
          string | null
        >`max(${agencyLead.adsUploads} -> 'lead' ->> 'at') filter (where ${agencyLead.source} = 'booking')`,
        qualified:
          sql<number>`count(*) filter (where ${agencyLead.adsUploads} -> 'qualified' ->> 'at' is not null)`.mapWith(
            Number
          ),
        qualifiedAt: sql<
          string | null
        >`max(${agencyLead.adsUploads} -> 'qualified' ->> 'at')`,
        won: sql<number>`count(${agencyLead.conversionUploadedAt})`.mapWith(
          Number
        ),
        wonAt: sql<
          string | null
        >`max(${agencyLead.conversionUploadedAt})::text`,
      })
      .from(agencyLead)
      .where(eq(agencyLead.projectId, ctx.client.projectId));

    return {
      customerId,
      actions,
      health,
      wired: wiredActions(ctx.client),
      uploads: {
        lead: { count: uploads?.lead ?? 0, lastAt: uploads?.leadAt ?? null },
        booking: {
          count: uploads?.booking ?? 0,
          lastAt: uploads?.bookingAt ?? null,
        },
        qualified: {
          count: uploads?.qualified ?? 0,
          lastAt: uploads?.qualifiedAt ?? null,
        },
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
      if (!preset)
        throw new TRPCError({ code: "NOT_FOUND", message: "Unknown preset." });
      try {
        const existing = await listConversionActionNames(ctx.customerId);
        const plan = planPreset(preset, existing);
        const created = await createConversionActions(
          ctx.customerId,
          plan.create
        );
        const wired = [
          ...plan.reuse,
          ...plan.create.map((action, i) => ({
            key: action.key,
            resourceName: created[i]!,
          })),
        ];
        for (const { key, resourceName } of wired)
          await wireStage(ctx.client, key, resourceName);
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
        if (update)
          await updateConversionAction(
            ctx.customerId,
            input.resourceName,
            update
          );
        if (input.stage !== undefined) {
          await unwireAction(ctx.client, input.resourceName);
          if (input.stage)
            await wireStage(ctx.client, input.stage, input.resourceName);
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
  if (
    !new RegExp(
      `^customers/${normalizeCustomerId(customerId)}/conversionActions/\\d+$`
    ).test(resourceName)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Unknown conversion action.",
    });
  }
}

/** Stop reporting any stage to this action. */
async function unwireAction(
  client: typeof agencyClient.$inferSelect,
  resourceName: string
) {
  const wired = wiredActions(client);
  for (const stage of [
    "lead",
    "booking",
    "qualified",
    "won",
    "calls",
  ] as const) {
    if (wired[stage] === resourceName) await wireStage(client, stage, null);
  }
}

// ─── Booking ─────────────────────────────────────────────────────
// Appointment settings + the owner's view of bookings. Visitors book through
// the public widget endpoint (apps/api .../agency/booking/[projectId]); the
// calendar behind everything is the OWNER's Google account (client.userId),
// no matter which hub member manages the booking.

const SLOT_MS = BOOKING_MINUTES * 60 * 1000;

/** The lead must be a live booking belonging to this client. */
async function findBookingLead(projectId: string, leadId: number) {
  const lead = await db.query.agencyLead.findFirst({
    where: and(eq(agencyLead.id, leadId), eq(agencyLead.projectId, projectId)),
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
      // The embed scripts key on projectId; full-access clients see it to build
      // their install snippet.
      projectId: ctx.role === "full-access" ? ctx.client.projectId : null,
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
        bookingOutcome: agencyLead.bookingOutcome,
        status: agencyLead.status,
        channel: agencyLead.channel,
      })
      .from(agencyLead)
      .where(
        and(
          eq(agencyLead.projectId, ctx.client.projectId),
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
        projectId: ctx.client.projectId,
        userId: ctx.client.userId,
        settings,
        fromMs,
        toMs,
      });
      return { slots };
    }),

  // How a past meeting went. A plain fact, no status change; null = undo.
  setOutcome: agencyWriteProcedure
    .input(
      z.object({
        leadId: z.number().int(),
        outcome: z.enum(["completed", "no_show"]).nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const lead = await findBookingLead(ctx.client.projectId, input.leadId);
      if (lead.bookingCanceledAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A canceled booking has no outcome.",
        });
      }
      if (!lead.bookingAt || lead.bookingAt > new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This meeting hasn't happened yet.",
        });
      }
      await db
        .update(agencyLead)
        .set({ bookingOutcome: input.outcome })
        .where(eq(agencyLead.id, lead.id));
    }),

  // Cancel: Google emails the visitor; the slot opens up again.
  cancel: agencyWriteProcedure
    .input(z.object({ leadId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const lead = await findBookingLead(ctx.client.projectId, input.leadId);
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
      const lead = await findBookingLead(ctx.client.projectId, input.leadId);
      if (lead.bookingCanceledAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This booking was canceled.",
        });
      }
      const atMs = Date.parse(input.at);
      if (
        !settings ||
        !Number.isFinite(atMs) ||
        atMs % SLOT_MS !== 0 ||
        !isValidSlot(new Date(atMs).toISOString(), settings, new Date())
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That time is not available.",
        });
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
        // Unique (project_id, booking_at): that slot is already booked.
        if ((error as { code?: string })?.code === "23505") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That time was just taken.",
          });
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
  // The agency workspace for one project, or null when the project isn't an
  // agency (no client row, no access, or no live agency subscription). The hub
  // picks the agency UI over the website editor on this.
  project: authenticatedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const client = await db.query.agencyClient.findFirst({
        where: eq(agencyClient.projectId, input.projectId),
      });
      if (!client) return null;
      const role = await agencyRoleForClient(user, client);
      if (!role) return null;

      const entitlement = await getEntitlement(input.projectId);
      if (entitlement.product !== "agency" && !isAdminUser(user)) return null;

      const project = await db.query.hubProject.findFirst({
        where: eq(hubProject.id, input.projectId),
        columns: { owner: true, repo: true, websiteUrl: true },
      });

      return {
        projectId: input.projectId,
        role,
        owner: project?.owner ?? "",
        repo: project?.repo ?? "",
        websiteUrl: project?.websiteUrl ?? null,
        hasSite: Boolean(project),
        adsConnected: Boolean(client.googleAdsCustomerId),
        adsType: (client.adsType ?? "search") as "search" | "lsa" | "both",
        conversionsWired: Boolean(
          client.googleAdsActions?.lead && client.googleAdsConversionAction
        ),
        // Only people who can edit the site need the install snippet; it keys
        // on projectId (above), so no separate value is returned here.
        canInstall: role === "full-access",
      };
    }),

  leads: leadsRouter,

  booking: bookingRouter,

  // Domains the capture + booking scripts are allowed to run on. One list per
  // project, stored on hub_project and shared with the website Domain card.
  origins: createTRPCRouter({
    get: agencyProcedure.query(async ({ ctx }) => {
      const [row] = await db
        .select({ origins: hubProject.origins })
        .from(hubProject)
        .where(eq(hubProject.id, ctx.client.projectId))
        .limit(1);
      return row?.origins ?? [];
    }),
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
          .update(hubProject)
          .set({ origins: cleaned })
          .where(eq(hubProject.id, ctx.client.projectId));
        return cleaned;
      }),
  }),

  // Per-client brand assets: a map of resourceKey -> list of value options.
  // Keys/shape are driven by the hub's BUSINESS_RESOURCES config, so adding a
  // new list is a config change only — no schema or router change here.
  businessInfo: createTRPCRouter({
    get: agencyProcedure.query(({ ctx }) => ctx.client.businessInfo ?? {}),
    set: agencyWriteProcedure
      .input(
        z.object({
          businessInfo: z.record(
            z.string().max(64),
            z.array(z.string().trim().max(2000)).max(50)
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Trim values but KEEP interior empties: several lists are positional
        // (brand purpose answers, per-segment problem/solution/key message
        // arrays aligned by index). Only trailing empties and lists with no
        // content at all are dropped.
        const cleaned = Object.fromEntries(
          Object.entries(input.businessInfo)
            .map(([key, values]) => {
              const trimmed = values.map((v) => v.trim());
              while (trimmed.length && !trimmed[trimmed.length - 1])
                trimmed.pop();
              return [key, trimmed] as const;
            })
            .filter(([, values]) => values.some(Boolean))
        );
        await db
          .update(agencyClient)
          .set({ businessInfo: cleaned })
          .where(eq(agencyClient.id, ctx.client.id));
        return cleaned;
      }),
  }),

  // Planned ad campaigns: keyword categories with per-keyword metrics and the
  // kept ad copy, stored as one jsonb list on the client.
  campaigns: createTRPCRouter({
    list: agencyProcedure.query(({ ctx }) => ctx.client.adCampaigns ?? []),
    create: agencyWriteProcedure
      .input(z.object({ name: z.string().trim().min(1).max(200) }))
      .mutation(async ({ ctx, input }) => {
        const campaign: AdCampaign = {
          id: crypto.randomUUID(),
          name: input.name,
          niche: "",
          keywords: [],
          adText: { headlines: [], descriptions: [], callouts: [] },
        };
        await db
          .update(agencyClient)
          .set({ adCampaigns: [...(ctx.client.adCampaigns ?? []), campaign] })
          .where(eq(agencyClient.id, ctx.client.id));
        return campaign;
      }),
    update: agencyWriteProcedure
      .input(
        z.object({
          id: z.string().max(64),
          name: z.string().trim().min(1).max(200).optional(),
          niche: z.string().trim().max(500).optional(),
          keywords: z
            .array(
              z.object({
                text: z.string().trim().max(200),
                avgMonthlySearches: z.string().trim().max(50),
                maxCpc: z.string().trim().max(50),
              })
            )
            .max(100)
            .optional(),
          adText: z
            .object({
              headlines: z.array(z.string().trim().max(200)).max(30),
              descriptions: z.array(z.string().trim().max(500)).max(30),
              callouts: z.array(z.string().trim().max(200)).max(30),
            })
            .optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const campaigns = ctx.client.adCampaigns ?? [];
        const current = campaigns.find((c) => c.id === input.id);
        if (!current)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Category not found.",
          });
        const updated: AdCampaign = {
          ...current,
          ...(input.name !== undefined && { name: input.name }),
          ...(input.niche !== undefined && { niche: input.niche }),
          ...(input.keywords !== undefined && {
            // Keep only rows with a keyword; metrics alone mean nothing.
            keywords: input.keywords.filter((k) => k.text),
          }),
          ...(input.adText !== undefined && {
            adText: {
              headlines: input.adText.headlines.filter(Boolean),
              descriptions: input.adText.descriptions.filter(Boolean),
              callouts: input.adText.callouts.filter(Boolean),
            },
          }),
        };
        await db
          .update(agencyClient)
          .set({
            adCampaigns: campaigns.map((c) =>
              c.id === input.id ? updated : c
            ),
          })
          .where(eq(agencyClient.id, ctx.client.id));
        return updated;
      }),
    remove: agencyWriteProcedure
      .input(z.object({ id: z.string().max(64) }))
      .mutation(async ({ ctx, input }) => {
        await db
          .update(agencyClient)
          .set({
            adCampaigns: (ctx.client.adCampaigns ?? []).filter(
              (c) => c.id !== input.id
            ),
          })
          .where(eq(agencyClient.id, ctx.client.id));
        return { ok: true };
      }),
  }),

  // Saved copies of the Monday report emails, newest week first.
  reports: createTRPCRouter({
    list: agencyProcedure.query(async ({ ctx }) => {
      await requireFeature(ctx.session.user, ctx.client.projectId, "leads");
      const rows = await db
        .select()
        .from(agencyWeeklyReport)
        .where(eq(agencyWeeklyReport.projectId, ctx.client.projectId))
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
      .input(
        dateRange.extend({ campaignId: z.string().regex(/^\d+$/).optional() })
      )
      .query(async ({ ctx, input }) => {
        await requireFeature(ctx.session.user, ctx.client.projectId, "ads");
        if (!ctx.client.googleAdsCustomerId || !isGoogleAdsConfigured())
          return null;
        try {
          const customerId = ctx.client.googleAdsCustomerId;
          return await cachedAds(
            customerId,
            `stats:${input.from}:${input.to}:${input.campaignId ?? "all"}`,
            ttlForRange(input.to),
            () =>
              getAdsStats(customerId, input.from, input.to, input.campaignId)
          );
        } catch (error) {
          throw new TRPCError({
            code: "BAD_GATEWAY",
            message: errorMessage(error),
          });
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
              () =>
                getSearchTerms(
                  customerId,
                  input.from,
                  input.to,
                  input.campaignId
                )
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

    // Starter negative keyword lists from the playbook, applied as shared
    // NEGATIVE_KEYWORDS sets. Keywords live server-side in negative-lists.ts.
    negativeLists: createTRPCRouter({
      // Unlike the other ads reads this never returns null: the chips render
      // from static data even before an account is linked.
      list: conversionsProcedure.query(async ({ ctx }) => {
        const customerId = ctx.client.googleAdsCustomerId;
        const adsConnected = Boolean(customerId) && isGoogleAdsConfigured();
        let applied: NegativeListKey[] = [];
        if (adsConnected) {
          try {
            const sets = await cachedAds(
              customerId!,
              "negativeLists",
              ADS_TTL.live,
              () => listSharedNegativeSets(customerId!, SHARED_SET_PREFIX)
            );
            const names = new Set(sets.map((set) => set.name));
            applied = STARTER_NEGATIVE_LISTS.filter((list) =>
              names.has(list.sharedSetName)
            ).map((list) => list.key);
          } catch (error) {
            throw adsError(error);
          }
        }
        return {
          industry: (ctx.client.industry ?? null) as Industry | null,
          applied,
          adsConnected,
          canManage: ctx.role === "full-access",
        };
      }),

      // "apply" is a reserved word in tRPC routers (Function.prototype.apply).
      applyList: conversionsManageProcedure
        .input(z.object({ listKey: z.enum(NEGATIVE_LIST_KEYS) }))
        .mutation(async ({ ctx, input }) => {
          const list = starterListByKey.get(input.listKey)!;
          // Universal lists always; an industry list only for that industry.
          if (list.industry && list.industry !== ctx.client.industry) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "That list is for a different industry.",
            });
          }
          try {
            const { attachedCampaigns } = await applySharedNegativeList(
              ctx.customerId,
              list.sharedSetName,
              list.words // `keep` words never leave the server
            );
            await invalidateAds(ctx.customerId, "negativeLists");
            return { attachedCampaigns, keywords: list.words.length };
          } catch (error) {
            throw adsError(error);
          }
        }),
    }),

    // Local Services Ads: leads and spend from the account's LSA campaign.
    lsa: createTRPCRouter({
      stats: conversionsProcedure
        .input(dateRange)
        .query(async ({ ctx, input }) => {
          const customerId = ctx.client.googleAdsCustomerId;
          if (!customerId || !isGoogleAdsConfigured()) return null;
          try {
            return await cachedAds(
              customerId,
              `lsa:stats:${input.from}:${input.to}`,
              ttlForRange(input.to),
              () => getLsaStats(customerId, input.from, input.to)
            );
          } catch (error) {
            throw adsError(error);
          }
        }),

      leads: conversionsProcedure
        .input(dateRange)
        .query(async ({ ctx, input }) => {
          const customerId = ctx.client.googleAdsCustomerId;
          if (!customerId || !isGoogleAdsConfigured()) return null;
          try {
            return await cachedAds(
              customerId,
              `lsa:leads:${input.from}:${input.to}`,
              ttlForRange(input.to),
              () => listLsaLeads(customerId, input.from, input.to)
            );
          } catch (error) {
            throw adsError(error);
          }
        }),
    }),

    // Health checks across budget, conversions, ads and uploads. Empty when
    // nothing needs attention; null when no account is linked. Cached 15 min.
    // Health checks shared with the weekly report email (lib/agency/account-alerts).
    alerts: conversionsProcedure.query(({ ctx }) =>
      getAccountAlerts(ctx.client)
    ),

    // Light list for the sidebar campaign filter. Null when no account linked.
    campaigns: agencyProcedure.query(async ({ ctx }) => {
      await requireFeature(ctx.session.user, ctx.client.projectId, "ads");
      const customerId = ctx.client.googleAdsCustomerId;
      if (!customerId || !isGoogleAdsConfigured()) return null;
      try {
        return await cachedAds(customerId, "campaigns", ADS_TTL.live, () =>
          listCampaigns(customerId)
        );
      } catch (error) {
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: errorMessage(error),
        });
      }
    }),

    conversions: conversionsRouter,
  }),

  admin: adminRouter,
});
