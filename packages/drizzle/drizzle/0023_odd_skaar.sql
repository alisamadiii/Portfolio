ALTER TABLE "agency_client" ADD COLUMN "booking_settings" jsonb;--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "booking_at" timestamp;--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "booking_end" timestamp;--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "booking_canceled_at" timestamp;--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "booking" jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX "agency_lead_repo_booking_at_idx" ON "agency_lead" USING btree ("repo_id","booking_at") WHERE "agency_lead"."booking_canceled_at" is null;