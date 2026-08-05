import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

// Marketing Emails (hub.alisamadii.com) — self-serve bulk email over the
// shared SES account. Contacts and campaigns are per-user; suppressions are
// global because one SES account means one shared sending reputation.

// Per-user sender profile. postalAddress is required before the first send
// (CAN-SPAM footer); fromEmail must belong to the user's emailDomain
// (api_client_settings) — validated at send time, not here.
export const marketingSettings = pgTable("marketing_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  fromName: text("from_name"),
  fromEmail: text("from_email"),
  replyTo: text("reply_to"),
  postalAddress: text("postal_address"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type MarketingSettings = typeof marketingSettings.$inferSelect;
export type NewMarketingSettings = typeof marketingSettings.$inferInsert;

// A user's audience. Emails are stored lowercased/trimmed; unsubscribes are
// per-user (an address that unsubscribes from one client's list may still be
// subscribed to another's).
export const marketingContacts = pgTable(
  "marketing_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    status: text("status", { enum: ["subscribed", "unsubscribed"] })
      .notNull()
      .default("subscribed"),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("marketing_contacts_user_email_idx").on(t.userId, t.email),
    index("marketing_contacts_user_created_idx").on(t.userId, t.createdAt),
  ]
);

export type MarketingContact = typeof marketingContacts.$inferSelect;
export type NewMarketingContact = typeof marketingContacts.$inferInsert;

// One campaign = one composed email sent to the user's subscribed contacts.
// html is the body with {{tokens}} still in place; the wrapped/branded final
// HTML is archived once per campaign in R2 under r2Key at send time.
export const marketingCampaigns = pgTable(
  "marketing_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    subject: text("subject").notNull(),
    // Snapshot of "Name <from@domain>" at send time.
    fromAddress: text("from_address"),
    editor: text("editor", { enum: ["rich", "html"] })
      .notNull()
      .default("rich"),
    // Tiptap document (rich mode only) so drafts stay re-editable.
    contentJson: jsonb("content_json"),
    html: text("html"),
    status: text("status", {
      enum: ["draft", "sending", "paused", "completed", "canceled", "failed"],
    })
      .notNull()
      .default("draft"),
    r2Key: text("r2_key"),
    workflowInstanceId: text("workflow_instance_id"),
    recipientCount: integer("recipient_count").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("marketing_campaigns_user_created_idx").on(t.userId, t.createdAt)]
);

export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;
export type NewMarketingCampaign = typeof marketingCampaigns.$inferInsert;

// Per-recipient send state, snapshotted from marketing_contacts when the
// campaign starts. The status column is both the progress counter (GROUP BY)
// and the workflow's work queue (WHERE status='pending') — marking a row sent
// immediately after its SES call is what makes step retries duplicate-safe.
export const marketingCampaignRecipients = pgTable(
  "marketing_campaign_recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => marketingCampaigns.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => marketingContacts.id, {
      onDelete: "set null",
    }),
    email: text("email").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    status: text("status", {
      enum: ["pending", "sent", "failed", "suppressed"],
    })
      .notNull()
      .default("pending"),
    messageId: text("message_id"),
    error: text("error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("marketing_recipients_campaign_email_idx").on(
      t.campaignId,
      t.email
    ),
    index("marketing_recipients_campaign_status_idx").on(
      t.campaignId,
      t.status
    ),
  ]
);

export type MarketingCampaignRecipient =
  typeof marketingCampaignRecipients.$inferSelect;
export type NewMarketingCampaignRecipient =
  typeof marketingCampaignRecipients.$inferInsert;

// Global suppression list — deliberately no userId. A hard bounce means the
// address is invalid for every sender on this SES account, and a complaint
// damages the shared reputation regardless of which client triggered it.
// sourceUserId is informational only (whose send surfaced it).
export const marketingSuppressions = pgTable("marketing_suppressions", {
  email: text("email").primaryKey(),
  reason: text("reason", { enum: ["bounce", "complaint", "manual"] }).notNull(),
  // e.g. the SNS bounce subtype ("General", "NoEmail", …).
  detail: text("detail"),
  sourceUserId: text("source_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type MarketingSuppression = typeof marketingSuppressions.$inferSelect;
export type NewMarketingSuppression = typeof marketingSuppressions.$inferInsert;
