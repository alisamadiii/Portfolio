import {
  boolean,
  index,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export type LeadScanStatus = "pending" | "done" | "error";
export type LeadStatus = "new" | "contacted" | "interested" | "won" | "lost";

// One Places Text Search run ("plumbers in Cape Coral, FL").
export const leadScan = pgTable("lead_scan", {
  id: serial("id").primaryKey(),

  query: text("query").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),

  status: text("status").$type<LeadScanStatus>().notNull().default("pending"),
  totalFound: integer("total_found").notNull().default(0),
  noWebsiteCount: integer("no_website_count").notNull().default(0),
  // Places Enterprise SKU calls consumed (free tier = 1,000/month).
  apiCalls: integer("api_calls").notNull().default(0),
  error: text("error"),

  createdAt: timestamp("created_at").defaultNow(),
});

export const lead = pgTable(
  "lead",
  {
    id: serial("id").primaryKey(),

    scanId: integer("scan_id")
      .notNull()
      .references(() => leadScan.id, { onDelete: "cascade" }),
    placeId: text("place_id").notNull().unique(),

    name: text("name").notNull(),
    address: text("address"),
    phone: text("phone"),
    // null = no website at all (the lead).
    website: text("website"),
    socialOnly: boolean("social_only").notNull().default(false),
    websiteDead: boolean("website_dead").notNull().default(false),

    rating: real("rating"),
    reviewCount: integer("review_count").notNull().default(0),
    mapsUrl: text("maps_url"),
    category: text("category"),

    score: integer("score").notNull().default(0),
    status: text("status").$type<LeadStatus>().notNull().default("new"),
    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    idxLeadScan: index("lead_scan_id_idx").on(table.scanId),
    idxLeadScore: index("lead_score_idx").on(table.score.desc()),
  })
);
