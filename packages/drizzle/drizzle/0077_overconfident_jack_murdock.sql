ALTER TABLE "partner" ADD COLUMN "mercury_invite_id" text;--> statement-breakpoint
ALTER TABLE "partner" ADD COLUMN "mercury_invite_url" text;--> statement-breakpoint
ALTER TABLE "partner" ADD COLUMN "mercury_invite_status" text;--> statement-breakpoint
ALTER TABLE "partner" ADD COLUMN "mercury_invite_at" timestamp;--> statement-breakpoint
ALTER TABLE "partner" ADD COLUMN "mercury_invite_checked_at" timestamp;--> statement-breakpoint
ALTER TABLE "partner" ADD COLUMN "mercury_recipient_id" text;--> statement-breakpoint
ALTER TABLE "partner" ADD COLUMN "mercury_bank_name" text;--> statement-breakpoint
ALTER TABLE "partner_referral" ADD COLUMN "mercury_transaction_id" text;--> statement-breakpoint
ALTER TABLE "partner_referral" ADD COLUMN "mercury_transaction_status" text;--> statement-breakpoint
ALTER TABLE "partner_referral" ADD COLUMN "mercury_transaction_url" text;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_partner_referral_mercury_tx" ON "partner_referral" USING btree ("mercury_transaction_id");