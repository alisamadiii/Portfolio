import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

// ─── Lead-generation agency ──────────────────────────────────────
// Agency clients get the agency UI in the Hub instead of the website one.
// Not to be confused with `lead` (leads.ts), which is outbound prospecting:
// these are inbound leads captured from a client's own website forms.

export const AGENCY_LEAD_STATUS_VALUES = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
  "spam",
] as const;
export type AgencyLeadStatus = (typeof AGENCY_LEAD_STATUS_VALUES)[number];
export type AgencyLeadSource = "form" | "booking" | "manual";

// Where the lead came from, computed at capture (lib/agency/lead-channel.ts).
export const AGENCY_LEAD_CHANNEL_VALUES = [
  "google_ads",
  "paid_other",
  "organic_search",
  "social",
  "email",
  "referral",
  "direct",
  "manual",
] as const;
export type AgencyLeadChannel = (typeof AGENCY_LEAD_CHANNEL_VALUES)[number];

export type AgencyLeadUtm = {
  source?: string;
  medium?: string;
  campaign?: string;
  /** utm_id: by convention the Google Ads campaign id (Campaign URL Builder). */
  id?: string;
  term?: string;
  content?: string;
};

// The visitor's first visit to the site (leads.js _lead_ft cookie).
export type AgencyLeadTouch = {
  referrer?: string;
  landing?: string;
  at?: string;
};

// The Google Ads click behind a lead, looked up by gclid in click_view.
export type AgencyLeadAdClick = {
  campaignId?: string;
  campaignName?: string;
  adGroupId?: string;
  adGroupName?: string;
  keyword?: string;
  matchType?: string;
  device?: string;
};

// Conversion actions our server reports to, by lead stage ("customers/<id>/conversionActions/<id>").
// The closed-deal action stays in googleAdsConversionAction; `calls` is tracked by Google itself.
// `booking` takes the "lead" stage for leads whose source is "booking".
export type AgencyAdsActions = {
  lead?: string;
  booking?: string;
  qualified?: string;
  calls?: string;
};
export type AgencyAdsBudget = { monthlyCents?: number };

// One keyword category = one planned Google Ads campaign. Metrics are text,
// pasted from Keyword Planner ("1K – 10K", "2.77"), never computed.
export type AdCampaignKeyword = {
  text: string;
  avgMonthlySearches: string;
  maxCpc: string;
};
export type AdCampaign = {
  id: string;
  name: string;
  niche: string;
  keywords: AdCampaignKeyword[];
  // The kept search-ad copy generated for this campaign.
  adText: { headlines: string[]; descriptions: string[]; callouts: string[] };
};

// Per-stage upload outcome on a lead (the closed deal keeps its own columns).
export type AgencyLeadUpload = {
  at?: string;
  error?: string;
  tries?: number;
  /** Data Manager ingest request id; processing is async, so "sent" isn't "accepted". */
  requestId?: string;
  /** Google confirmed the records were processed successfully. */
  verified?: boolean;
  /** Google processed the request but rejected the records. */
  verifyError?: string;
};
export type AgencyLeadUploads = {
  lead?: AgencyLeadUpload;
  qualified?: AgencyLeadUpload;
  /** Won keeps conversionUploadedAt/conversionError as source of truth for "sent". */
  won?: AgencyLeadUpload;
};

// One row per agency workspace, living inside one project (hub_project), plus
// its Google Ads wiring. A user can own several (one per business).
export const agencyClient = pgTable(
  "agency_client",
  {
    id: serial("id").primaryKey(),

    // The owner. Not unique: one user can run several agency projects.
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // The project this agency lives in (hub_project.id) and the tenant id
    // for leads/booking/entitlement. No FK.
    projectId: uuid("project_id").notNull().unique(),


    // The embed scripts (leads.js / contact.js) post keyed by the project's
    // projectId above (data-key=projectId) — no separate public key. Abuse is bounded
    // by the origins allowlist (now hub_project.origins) + the Postgres rate limiter.

    // Per-client brand assets: resourceKey -> list of value options (business
    // titles, descriptions, taglines, ...). Keys are driven by the hub's
    // BUSINESS_RESOURCES config, so new lists need no schema change.
    businessInfo: jsonb("business_info").$type<Record<string, string[]>>(),

    // Planned ad campaigns: keyword categories with per-keyword metrics and the
    // kept ad copy. Edited on the hub's Business Information pages.
    adCampaigns: jsonb("ad_campaigns").$type<AdCampaign[]>(),

    // Client's trade, for the industry-specific starter negative list.
    // Values match the trpc negative-lists INDUSTRIES; null = none.
    industry: text("industry").$type<
      "pest-control" | "handyman" | "barbershop" | "restaurant"
    >(),

    // Which Google ads products this client runs; null = classic Search.
    adsType: text("ads_type").$type<"search" | "lsa" | "both">(),

    // Client account under the agency MCC, digits only ("1234567890").
    googleAdsCustomerId: text("google_ads_customer_id"),
    // "customers/<id>/conversionActions/<id>" for the closed-deal import.
    googleAdsConversionAction: text("google_ads_conversion_action"),
    googleAdsActions: jsonb("google_ads_actions").$type<AgencyAdsActions>(),
    // Monthly ad spend target for budget pacing; unset = no pacing shown.
    googleAdsBudget: jsonb("google_ads_budget").$type<AgencyAdsBudget>(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("idx_agency_client_user").on(t.userId)]
);

export const agencyLead = pgTable(
  "agency_lead",
  {
    id: serial("id").primaryKey(),
    projectId: uuid("project_id").notNull(),

    name: text("name"),
    email: text("email"),
    phone: text("phone"),
    message: text("message"),
    // Any other submitted fields, as posted.
    fields: jsonb("fields").$type<Record<string, string>>(),
    formName: text("form_name"),
    source: text("source").$type<AgencyLeadSource>().notNull().default("form"),

    // Attribution captured by the leads.js cookie.
    pageUrl: text("page_url"),
    referrer: text("referrer"),
    utm: jsonb("utm").$type<AgencyLeadUtm>(),
    gclid: text("gclid"),
    gbraid: text("gbraid"),
    wbraid: text("wbraid"),
    // Page the visit started on, the first visit ever, and when the ad was clicked.
    landingPage: text("landing_page"),
    firstTouch: jsonb("first_touch").$type<AgencyLeadTouch>(),
    clickAt: timestamp("click_at"),
    // Null on rows captured before channels existed; read falls back to classifyLead.
    channel: text("channel").$type<AgencyLeadChannel>(),
    // Filled in later from Google Ads (click data lands a few hours after the click).
    adClick: jsonb("ad_click").$type<AgencyLeadAdClick>(),
    adClickCheckedAt: timestamp("ad_click_checked_at"),

    status: text("status").$type<AgencyLeadStatus>().notNull().default("new"),
    valueCents: integer("value_cents"),
    currency: text("currency").notNull().default("USD"),
    wonAt: timestamp("won_at"),
    notes: text("notes"),
    // First time the lead entered each status; set once, never cleared on revert.
    contactedAt: timestamp("contacted_at"),
    qualifiedAt: timestamp("qualified_at"),
    lostAt: timestamp("lost_at"),
    lostReason: text("lost_reason"),

    // Offline conversion upload to Google Ads (closed deal).
    conversionUploadedAt: timestamp("conversion_uploaded_at"),
    conversionError: text("conversion_error"),
    // New-lead and qualified uploads (Marketing > Conversions presets).
    adsUploads: jsonb("ads_uploads").$type<AgencyLeadUploads>(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    idxProjectCreated: index("agency_lead_project_created_idx").on(
      table.projectId,
      table.createdAt.desc()
    ),
    idxProjectChannelCreated: index("agency_lead_project_channel_created_idx").on(
      table.projectId,
      table.channel,
      table.createdAt.desc()
    ),
  })
);

// Google Ads API responses per client account, so dashboards share one fetch
// instead of spending API operations on every page view.
export const agencyAdsCache = pgTable(
  "agency_ads_cache",
  {
    id: serial("id").primaryKey(),
    customerId: text("customer_id").notNull(),
    key: text("key").notNull(),
    data: jsonb("data").notNull(),
    fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqCustomerKey: uniqueIndex("agency_ads_cache_customer_key_idx").on(
      table.customerId,
      table.key
    ),
  })
);

// Fixed-window counters for the public lead capture endpoint, shared by every
// serverless instance (an in-memory map resets per instance).
export const agencyRateLimit = pgTable(
  "agency_rate_limit",
  {
    key: text("key").primaryKey(),
    windowStart: timestamp("window_start").notNull().defaultNow(),
    count: integer("count").notNull().default(0),
  },
  (table) => ({
    idxWindowStart: index("agency_rate_limit_window_start_idx").on(
      table.windowStart
    ),
  })
);

