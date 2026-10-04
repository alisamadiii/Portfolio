import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Stripe subscription statuses (superset of the legacy Polar values still
// present on historical rows — only "paused" is Stripe-specific).
const SUBSCRIPTION_STATUSES = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
] as const;

// Stripe invoice statuses + legacy Polar order statuses kept so historical
// rows stay readable ("pending", "refunded", "partially_refunded").
const ORDER_STATUSES = [
  "paid",
  "open",
  "void",
  "uncollectible",
  "draft",
  "pending",
  "refunded",
  "partially_refunded",
] as const;

// Mirror of the Stripe product catalog. `id` holds the Stripe product id
// (prod_…) for new rows; historical rows keep their Polar UUIDs.
export const products = pgTable("product", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  trialInterval: text("trial_interval", {
    enum: ["day", "week", "month", "year"],
  }),
  trialIntervalCount: integer("trial_interval_count").default(0),
  popular: boolean("popular").notNull().default(false),
  priceAmount: integer("price_amount").notNull(),
  priceCurrency: text("price_currency").notNull().default("usd"),
  recurringInterval: text("recurring_interval", {
    enum: ["day", "week", "month", "year"],
  }),
  isRecurring: boolean("is_recurring").notNull().default(true),
  isArchived: boolean("is_archived").notNull().default(false),
  // Stripe price id (price_…) used to build checkout line items. Null on
  // historical Polar rows.
  stripePriceId: text("stripe_price_id"),
  metadata: jsonb("metadata").$type<unknown>().notNull().default({}),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

// The single subscription table — product subscriptions (Motion etc.) AND
// per-project CMS subscriptions live here, distinguished by `repoId`:
//   repoId NULL     -> product subscription, keyed/upserted on `id` (sub_…)
//   repoId NOT NULL -> per-project CMS subscription, one row per project,
//                      upserted on the partial-unique repoId index by the
//                      Stripe webhook's state-sync. Admin-granted
//                      free/free_lifetime rows have no Stripe sub and use
//                      id = 'free_<repoId>'.
// Historical product rows keep their Polar UUID ids.
export const subscriptions = pgTable(
  "subscription",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    email: text("email").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("usd"),
    productId: text("product_id").notNull(),
    status: text("status", {
      enum: [...SUBSCRIPTION_STATUSES] as [string, ...string[]],
    })
      .$type<(typeof SUBSCRIPTION_STATUSES)[number]>()
      .notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
    trialStart: timestamp("trial_start"),
    trialEnd: timestamp("trial_end"),
    startedAt: timestamp("started_at"),
    canceledAt: timestamp("canceled_at"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    recurringInterval: text("recurring_interval", {
      enum: ["day", "week", "month", "year"],
    }),
    customerCancellationReason: text("customer_cancellation_reason"),
    customerCancellationComment: text("customer_cancellation_comment"),
    // ── Per-project CMS columns (null on product rows) ──
    // GitHub-stable repo id, unique per project. Survives repo rename.
    repoId: integer("repo_id"),
    // Plan tier — drives gating + home badge. Stripe rows use "paid";
    // "free"/"free_lifetime" are admin-granted with no Stripe subscription.
    plan: text("plan", { enum: ["free", "free_lifetime", "paid"] }),
    stripeCustomerId: text("stripe_customer_id"),
    priceId: text("price_id"),
    currentPeriodEnd: timestamp("current_period_end"),
    metadata: jsonb("metadata").$type<unknown>().notNull().default({}),
  },
  (table) => ({
    // One CMS subscription row per project (webhook upsert target).
    uqSubscriptionRepoId: uniqueIndex("uq_subscription_repo_id")
      .on(table.repoId)
      .where(sql`${table.repoId} is not null`),
    // Fast webhook lookup by Stripe customer.
    idxSubscriptionCustomer: index("idx_subscription_customer").on(
      table.stripeCustomerId
    ),
  })
);

// Mirror of Stripe invoices / one-time payments (in_… / pi_…); historical
// rows keep Polar UUIDs.
export const orders = pgTable("order", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  email: text("email").notNull(),
  productId: text("product_id").notNull(),
  billingName: text("billing_name").notNull(),
  subscriptionId: text("subscription_id").notNull(),
  // Stripe invoice billing_reason (subscription_create, subscription_cycle,
  // manual, …) or the legacy Polar values ("purchase", "subscription_create").
  billingReason: text("billing_reason").notNull(),
  totalAmount: integer("total_amount").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  status: text("status", {
    enum: [...ORDER_STATUSES] as [string, ...string[]],
  })
    .$type<(typeof ORDER_STATUSES)[number]>()
    .notNull(),
  discountAmount: integer("discount_amount").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  metadata: jsonb("metadata").$type<unknown>().notNull().default({}),
});

export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull(),
  type: text("type").notNull(), // e.g. subscription.updated
  createdAt: timestamp("created_at").defaultNow(),
  payload: jsonb("payload").$type<unknown>().notNull(),
});
