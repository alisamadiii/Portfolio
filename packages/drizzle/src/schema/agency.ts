import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
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
export type AgencyLeadSource = "form" | "manual";

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
  term?: string;
  content?: string;
};

// The visitor's first visit to the site (f.js _lead_ft cookie).
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
export type AgencyAdsActions = { lead?: string; qualified?: string; calls?: string };

// Per-stage upload outcome on a lead (the closed deal keeps its own columns).
export type AgencyLeadUpload = { at?: string; error?: string; tries?: number };
export type AgencyLeadUploads = { lead?: AgencyLeadUpload; qualified?: AgencyLeadUpload };

// One row per agency client: their single website plus Google Ads wiring.
export const agencyClient = pgTable("agency_client", {
  id: serial("id").primaryKey(),

  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  // The client's one website (hub_project.repoId). Null until it's built and
  // linked: the client then sees "workspace not ready" instead of the agency UI.
  repoId: bigint("repo_id", { mode: "number" }).unique(),

  // Public key the capture script posts with (f.js data-key).
  formKey: text("form_key").notNull().unique(),

  // Client account under the agency MCC, digits only ("1234567890").
  googleAdsCustomerId: text("google_ads_customer_id"),
  // "customers/<id>/conversionActions/<id>" for the closed-deal import.
  googleAdsConversionAction: text("google_ads_conversion_action"),
  googleAdsActions: jsonb("google_ads_actions").$type<AgencyAdsActions>(),

  // New-lead notification address; falls back to the owner's email.
  leadNotifyEmail: text("lead_notify_email"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const agencyLead = pgTable(
  "agency_lead",
  {
    id: serial("id").primaryKey(),
    repoId: bigint("repo_id", { mode: "number" }).notNull(),

    name: text("name"),
    email: text("email"),
    phone: text("phone"),
    message: text("message"),
    // Any other submitted fields, as posted.
    fields: jsonb("fields").$type<Record<string, string>>(),
    formName: text("form_name"),
    source: text("source").$type<AgencyLeadSource>().notNull().default("form"),

    // Attribution captured by the f.js cookie.
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
    idxRepoCreated: index("agency_lead_repo_created_idx").on(
      table.repoId,
      table.createdAt.desc()
    ),
    idxRepoChannelCreated: index("agency_lead_repo_channel_created_idx").on(
      table.repoId,
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
    idxWindowStart: index("agency_rate_limit_window_start_idx").on(table.windowStart),
  })
);
