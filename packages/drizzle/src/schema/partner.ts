import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { hubProject } from "./hub";

// ─── Partner program ─────────────────────────────────────────────
// Referral partners apply on partners.alisamadii.com, Ali approves them by
// hand in admin, and they earn their commission rate (default 20%) of a
// referred client's first website payment after payment processing fees. Status/source columns are plain text (not pgEnum), like hub.ts.

export const PARTNER_STATUS_VALUES = ["pending", "approved", "rejected"] as const;
export type PartnerStatus = (typeof PARTNER_STATUS_VALUES)[number];

export const PARTNER_REFERRAL_STATUS_VALUES = [
  "new",
  "talking",
  "won",
  "lost",
] as const;
export type PartnerReferralStatus =
  (typeof PARTNER_REFERRAL_STATUS_VALUES)[number];
export type PartnerReferralSource = "manual" | "form";
export const CLIENT_PAYMENT_METHODS = [
  "stripe",
  "cashapp",
  "zelle",
  "cash",
  "other",
] as const;
export type ClientPaymentMethod = (typeof CLIENT_PAYMENT_METHODS)[number];
export const MERCURY_INVITE_STATUSES = ["created", "completed", "expired", "declined"] as const;
export type MercuryInviteStatus = (typeof MERCURY_INVITE_STATUSES)[number];
export const MERCURY_TRANSACTION_STATUSES = [
  "pending",
  "sent",
  "cancelled",
  "failed",
  "reversed",
  "blocked",
] as const;
export type MercuryTransactionStatus = (typeof MERCURY_TRANSACTION_STATUSES)[number];

export const partner = pgTable(
  "partner",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    status: text("status").$type<PartnerStatus>().notNull().default("pending"),
    // The Client Hub account that applied (sign-in is required to apply).
    // Kept if the account is deleted: the signed agreement still stands.
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    // Chosen by Ali on approval, stored uppercased (e.g. "ALI"). Unique
    // case-insensitively: see uq_partner_code_lower.
    code: text("code").unique(),

    // Application. email is the account email, lowercased (unique).
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    // Mailing address on the agreement (null for applications before 2026-11.2).
    address: text("address"),
    // "Your network" step is optional.
    occupation: text("occupation"),
    city: text("city"),
    knowOwners: text("know_owners"),
    whyJoin: text("why_join"),

    // Signed agreement. The PDF rendered at apply time lives in the private
    // R2 bucket under agreementKey; pdfToken is the unguessable download id.
    agreementVersion: text("agreement_version").notNull(),
    signature: text("signature").notNull(),
    initials: text("initials").notNull(),
    signedAt: timestamp("signed_at").notNull(),
    signedIp: text("signed_ip"),
    userAgent: text("user_agent"),
    pdfToken: text("pdf_token").notNull().unique(),
    agreementKey: text("agreement_key"),

    // Admin-only payout note. Applications before 2026-11.4 stored
    // "Zelle: handle" here; partners now add their bank through Mercury.
    payoutMethod: text("payout_method"),
    // Mercury recipient invite (POST /recipients/invites, sent on approval).
    // The partner adds their own bank details on Mercury's form: we store
    // the invite, its status and the resulting recipient id, never account
    // or routing numbers. Status: created | completed | expired | declined.
    mercuryInviteId: text("mercury_invite_id"),
    mercuryInviteUrl: text("mercury_invite_url"),
    mercuryInviteStatus: text("mercury_invite_status").$type<MercuryInviteStatus>(),
    mercuryInviteAt: timestamp("mercury_invite_at"),
    mercuryInviteCheckedAt: timestamp("mercury_invite_checked_at"),
    mercuryRecipientId: text("mercury_recipient_id"),
    mercuryBankName: text("mercury_bank_name"),
    // Share of the net first payment, in basis points (2000 = 20%). Admin
    // sets it per partner; must default to DEFAULT_COMMISSION_BPS.
    commissionBps: integer("commission_bps").notNull().default(2000),
    // Admin only.
    notes: text("notes"),
    approvedAt: timestamp("approved_at"),
    rejectedAt: timestamp("rejected_at"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("uq_partner_email").on(t.email),
    uniqueIndex("uq_partner_user").on(t.userId),
    uniqueIndex("uq_partner_code_lower").on(sql`lower(${t.code})`),
    index("idx_partner_status").on(t.status),
  ]
);

// A Client Hub project a partner referred (set by Ali, admin only). Money in
// cents. "Paying" = clientPaidAt set, "paid out" = partnerPaidAt set;
// commission defaults to the partner's rate of what the client paid. Form referrals (a code
// typed on www.alisamadii.com) start as leads with no project until linked.
export const partnerReferral = pgTable(
  "partner_referral",
  {
    id: serial("id").primaryKey(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partner.id, { onDelete: "cascade" }),
    // The referred project. One partner per project (uq index). Set null if
    // the project is deleted; businessName keeps the name for history.
    projectId: uuid("project_id").references(() => hubProject.id, {
      onDelete: "set null",
    }),

    // Snapshot of the project's name (or the form lead's business name).
    businessName: text("business_name").notNull(),
    // Form leads only: who filled the agency form.
    contactName: text("contact_name"),
    email: text("email"),
    phone: text("phone"),
    notes: text("notes"),
    source: text("source")
      .$type<PartnerReferralSource>()
      .notNull()
      .default("manual"),
    status: text("status")
      .$type<PartnerReferralStatus>()
      .notNull()
      .default("new"),

    // The website price agreed with the client (expected first payment).
    priceCents: integer("price_cents"),
    clientPaidCents: integer("client_paid_cents"),
    clientPaymentMethod: text("client_payment_method").$type<ClientPaymentMethod>(),
    clientPaidAt: timestamp("client_paid_at"),
    commissionCents: integer("commission_cents"),
    partnerPaidAt: timestamp("partner_paid_at"),
    payoutReference: text("payout_reference"),
    // Proof of the payout (private R2 key + original file name). Required
    // when marking the partner paid.
    payoutReceiptKey: text("payout_receipt_key"),
    payoutReceiptName: text("payout_receipt_name"),
    // The Mercury ACH that paid this commission, matched by the Mercury
    // webhook (recipient + amount). The dashboard link doubles as the receipt.
    mercuryTransactionId: text("mercury_transaction_id"),
    mercuryTransactionStatus: text("mercury_transaction_status").$type<MercuryTransactionStatus>(),
    mercuryTransactionUrl: text("mercury_transaction_url"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("idx_partner_referral_partner").on(t.partnerId),
    uniqueIndex("uq_partner_referral_project").on(t.projectId),
    uniqueIndex("uq_partner_referral_mercury_tx").on(t.mercuryTransactionId),
  ]
);
