import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export type LeadScanStatus = "pending" | "done" | "error";
export type LeadStatus =
  | "new"
  | "contacted"
  | "interested"
  | "meeting"
  | "won"
  | "lost";
export type LeadCreditReason =
  | "signup"
  | "purchase"
  | "refund"
  | "reset"
  | "scan"
  | "unlock"
  | "adjustment";

// One Places Text Search run ("plumbers in Cape Coral, FL").
export const leadScan = pgTable(
  "lead_scan",
  {
    id: serial("id").primaryKey(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id),

    query: text("query").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),

    // Scan searched around home base instead of a picked city.
    nearMe: boolean("near_me").notNull().default(false),

    status: text("status").$type<LeadScanStatus>().notNull().default("pending"),
    totalFound: integer("total_found").notNull().default(0),
    noWebsiteCount: integer("no_website_count").notNull().default(0),
    // Places Enterprise SKU calls consumed (global monthly spend guard).
    apiCalls: integer("api_calls").notNull().default(0),
    error: text("error"),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    idxScanUser: index("lead_scan_user_idx").on(
      table.userId,
      table.createdAt.desc()
    ),
  })
);

export const lead = pgTable(
  "lead",
  {
    id: serial("id").primaryKey(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id),

    scanId: integer("scan_id")
      .notNull()
      .references(() => leadScan.id, { onDelete: "cascade" }),
    placeId: text("place_id").notNull(),

    name: text("name").notNull(),
    address: text("address"),
    phone: text("phone"),
    // null = no website at all (the lead).
    website: text("website"),
    socialOnly: boolean("social_only").notNull().default(false),
    websiteDead: boolean("website_dead").notNull().default(false),

    // Miles from home base; only set on near-me scans.
    distanceMiles: real("distance_miles"),

    rating: real("rating"),
    reviewCount: integer("review_count").notNull().default(0),
    mapsUrl: text("maps_url"),
    category: text("category"),

    score: integer("score").notNull().default(0),
    status: text("status").$type<LeadStatus>().notNull().default("new"),
    notes: text("notes"),

    // User-entered — Places never returns emails. Meeting invites go here.
    email: text("email"),
    // Set when the user hits "Start" on the lead; flips the sheet into
    // working mode permanently.
    startedAt: timestamp("started_at"),
    // One upcoming Google Calendar meeting per lead; scheduling again
    // replaces the event. htmlLink is stored because it can't be rebuilt
    // from the event id.
    meetingEventId: text("meeting_event_id"),
    meetingAt: timestamp("meeting_at"),
    meetingUrl: text("meeting_url"),

    // false = billable prospect the user hasn't paid a credit for yet;
    // contact fields are masked server-side until unlocked.
    unlocked: boolean("unlocked").notNull().default(true),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    idxLeadScan: index("lead_scan_id_idx").on(table.scanId),
    idxLeadScore: index("lead_score_idx").on(table.score.desc()),
    idxLeadUser: index("lead_user_idx").on(table.userId),
    uqUserPlace: uniqueIndex("lead_user_place_uq").on(
      table.userId,
      table.placeId
    ),
  })
);

// Credit ledger: balance = sum(delta) per user. Grants are positive,
// debits negative. No cached balance column on purpose.
export const leadCreditLedger = pgTable(
  "lead_credit_ledger",
  {
    id: serial("id").primaryKey(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id),

    delta: integer("delta").notNull(),
    reason: text("reason").$type<LeadCreditReason>().notNull(),
    // signup → userId, purchase/refund → Stripe invoice id, scan/unlock → scanId.
    refId: text("ref_id"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    idxCreditUser: index("lead_credit_user_idx").on(table.userId),
    // Grants must be idempotent (webhook retries, lazy signup grant,
    // per-invoice subscription resets); scan/unlock debits may repeat per
    // refId so they are excluded.
    uqCreditGrant: uniqueIndex("lead_credit_grant_uq")
      .on(table.reason, table.refId)
      .where(sql`${table.reason} in ('signup', 'purchase', 'refund', 'reset')`),
  })
);
