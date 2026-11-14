ALTER TABLE "partner_referral" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "partner_referral" ADD COLUMN "price_cents" integer;--> statement-breakpoint
ALTER TABLE "partner_referral" ADD COLUMN "client_payment_method" text;--> statement-breakpoint
ALTER TABLE "partner_referral" ADD CONSTRAINT "partner_referral_project_id_hub_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."hub_project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_partner_referral_project" ON "partner_referral" USING btree ("project_id");