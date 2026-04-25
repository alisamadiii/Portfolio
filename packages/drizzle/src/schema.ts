import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type Stripe from "stripe";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role"),
  banned: boolean("banned"),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  metadata: jsonb("metadata").default({}),
  stripeCustomerId: text("stripe_customer_id"),

  // New
  phone: text("phone"),
  company: text("company"),
  address: text("address"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
  activeOrganizationId: text("active_organization_id"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
});

// Local mirror of Stripe products — synced via webhooks
export const products = pgTable("product", {
  id: text("id").primaryKey(), // Stripe product ID (prod_xxx)
  name: text("name").notNull(),
  description: text("description"),
  popular: boolean("popular").notNull().default(false),
  priceId: text("price_id"), // Stripe price ID (price_xxx)
  priceAmount: integer("price_amount").notNull().default(0),
  priceCurrency: text("price_currency").notNull().default("usd"),
  recurringInterval: text("recurring_interval", {
    enum: ["day", "week", "month", "year"],
  }),
  isRecurring: boolean("is_recurring").notNull().default(true),
  isArchived: boolean("is_archived").notNull().default(false),
  metadata: jsonb("metadata").$type<unknown>().notNull().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Better Auth Stripe plugin manages this table automatically.
// Defined here so tRPC routers and admin queries can reference it.
export const subscription = pgTable("subscription", {
  id: text("id").primaryKey(),
  plan: text("plan").notNull(),
  referenceId: text("reference_id").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status", {
    enum: [
      "active",
      "canceled",
      "incomplete",
      "incomplete_expired",
      "past_due",
      "paused",
      "trialing",
      "unpaid",
    ] as const satisfies readonly Stripe.Subscription.Status[],
  })
    .notNull()
    .default("incomplete"),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  cancelAt: timestamp("cancel_at"),
  canceledAt: timestamp("canceled_at"),
  endedAt: timestamp("ended_at"),
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),
  seats: integer("seats"),
  totalAmount: integer("total_amount").notNull().default(0),
  currency: text("currency").notNull().default("usd"),
  itemCount: integer("item_count").notNull().default(1),
  billingInterval: text("billing_interval"),
  stripeScheduleId: text("stripe_schedule_id"),
});

// Local mirror of Stripe invoices — synced via webhooks
export const invoices = pgTable("invoice", {
  id: text("id").primaryKey(), // Stripe invoice ID (in_xxx)
  userId: text("user_id").notNull(),
  email: text("email").notNull(),
  productId: text("product_id"),
  subscriptionId: text("subscription_id"),
  billingName: text("billing_name"),
  billingReason: text("billing_reason"),
  totalAmount: integer("total_amount").notNull().default(0),
  invoiceNumber: text("invoice_number"),
  status: text("status", {
    enum: [
      "draft",
      "open",
      "paid",
      "uncollectible",
      "void",
    ] as const satisfies readonly Stripe.Invoice.Status[],
  }).notNull(),
  currency: text("currency").notNull().default("usd"),
  hostedInvoiceUrl: text("hosted_invoice_url"),
  pdfUrl: text("pdf_url"),
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

export const source = pgTable("source", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  title: text("title").notNull(),
  description: text("description"),
  isPrivate: boolean("is_private").notNull().default(true),
  imageUrl: text("image_url"),
  darkImageUrl: text("dark_image_url"),
  videoUrl: text("video_url"),
  darkVideoUrl: text("dark_video_url"),
  from: text("from"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sourceFile = pgTable("source_file", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  index: integer("index").notNull().default(0),

  sourceId: uuid("source_id")
    .notNull()
    .references(() => source.id, { onDelete: "cascade" }),

  filename: text("filename").notNull(),
  path: text("path"), // optional: "src/components/Button.tsx"
  content: text("content").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const previousCustomers = pgTable("previous_customers", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  email: text("email").notNull(),
  code: text("code").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const coldEmails = pgTable("cold_emails", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Don't change the order of the values
export const projectsTypeValues = [
  "PORTFOLIO",
  "DOCS",
  "MOTION",
  "AGENCY",
  "TEMPLATE",
  "ADMIN",
] as const;
export const projectsTypeEnum = pgEnum("projects_type", projectsTypeValues);

export const notificationTypeValues = [
  "SERVICE_CHANGE_REQUEST",
  "SERVICE_CHANGE_APPROVED",
  "SERVICE_CHANGE_REJECTED",
  "CLIENT_MESSAGE",
  "SYSTEM_ALERT",
  "PAYMENT_UPDATE",
  "ACCOUNT_DELETION_REQUEST",
] as const;
export const notificationTypeEnum = pgEnum(
  "notification_type",
  notificationTypeValues
);

export const clientNotificationStatusValues = [
  "PENDING",
  "SEEN",
  "SEEN_BY_ADMIN",
  "RESOLVED",
  "REJECTED",
  "REPLIED",
] as const;
export const clientNotificationStatusEnum = pgEnum(
  "client_notification_status",
  clientNotificationStatusValues
);

export const clientNotifications = pgTable("client_notifications", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email"),
  projectType: projectsTypeEnum("project_type").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  priority: text("priority").notNull().default("MEDIUM"),
  status: clientNotificationStatusEnum("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  seenAt: timestamp("seen_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const contactSubmissionStatusValues = [
  "NEW",
  "READ",
  "REPLIED",
  "ARCHIVED",
] as const;
export const contactSubmissionStatusEnum = pgEnum(
  "contact_submission_status",
  contactSubmissionStatusValues
);

export const contactSubmissions = pgTable("contact_submissions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  submitterName: text("submitter_name").notNull(),
  submitterEmail: text("submitter_email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata").default({}),
  sourceUrl: text("source_url"),
  status: contactSubmissionStatusEnum("status").notNull().default("NEW"),
  reportedAt: timestamp("reported_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ProjectType = (typeof projectsTypeValues)[number];
export type NotificationType = (typeof notificationTypeValues)[number];
export type ClientNotificationStatus =
  (typeof clientNotificationStatusValues)[number];
export type ContactSubmissionStatus =
  (typeof contactSubmissionStatusValues)[number];
