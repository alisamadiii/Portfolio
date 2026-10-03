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

// Mirror of Stripe subscriptions (sub_…); historical rows keep Polar UUIDs.
export const subscriptions = pgTable("subscription", {
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
  metadata: jsonb("metadata").$type<unknown>().notNull().default({}),
});

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

// Per-project (= GitHub repo) hub subscription. Framer-style: one row per
// project, independently free / free-for-life / paid. Stripe stays the source
// of truth (checkout, invoices, portal); this table mirrors only what the hub
// needs to render + badge. Synced by the standalone Stripe webhook using the
// state-sync pattern (any event -> subscriptions.list -> upsert on repoId).
// The project<->payment join is `subscription.metadata.repoId`, never email.
export const hubSubscription = pgTable(
  "hub_subscription",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    // GitHub-stable repo id, unique in hubProject. Survives repo rename.
    repoId: integer("repo_id").notNull(),
    // Client user who owns the subscription. Nullable: admin-granted free rows
    // may predate a signup.
    userId: text("user_id"),
    email: text("email"),
    // Plan tier — drives the gating + home badge. Stripe rows use "paid";
    // "free"/"free_lifetime" are admin-granted with no Stripe subscription.
    plan: text("plan", {
      enum: ["free", "free_lifetime", "paid"],
    })
      .notNull()
      .default("paid"),
    // Stripe mirror (null for free/free_lifetime rows).
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    status: text("status"), // active | trialing | past_due | canceled | ...
    priceId: text("price_id"),
    productId: text("product_id"),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    metadata: jsonb("metadata").$type<unknown>().notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    // One subscription row per project (upsert target for the webhook).
    uqHubSubscriptionRepoId: uniqueIndex("uq_hub_subscription_repo_id").on(
      table.repoId
    ),
    // Fast webhook lookup by Stripe customer.
    idxHubSubscriptionCustomer: index("idx_hub_subscription_customer").on(
      table.stripeCustomerId
    ),
  })
);

export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull(),
  type: text("type").notNull(), // e.g. subscription.updated
  createdAt: timestamp("created_at").defaultNow(),
  payload: jsonb("payload").$type<unknown>().notNull(),
});
