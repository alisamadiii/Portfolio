import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
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

export type AgencyLeadUtm = {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
};

// One row per agency client: their single website plus Google Ads wiring.
export const agencyClient = pgTable("agency_client", {
  id: serial("id").primaryKey(),

  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  // The client's one website (hub_project.repoId).
  repoId: bigint("repo_id", { mode: "number" }).notNull().unique(),

  // Public key the capture script posts with (f.js data-key).
  formKey: text("form_key").notNull().unique(),

  // Client account under the agency MCC, digits only ("1234567890").
  googleAdsCustomerId: text("google_ads_customer_id"),
  // "customers/<id>/conversionActions/<id>" for the closed-deal import.
  googleAdsConversionAction: text("google_ads_conversion_action"),

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

    status: text("status").$type<AgencyLeadStatus>().notNull().default("new"),
    valueCents: integer("value_cents"),
    currency: text("currency").notNull().default("USD"),
    wonAt: timestamp("won_at"),
    notes: text("notes"),

    // Offline conversion upload to Google Ads (closed deal).
    conversionUploadedAt: timestamp("conversion_uploaded_at"),
    conversionError: text("conversion_error"),

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
  })
);
