ALTER TABLE "agency_client" ADD COLUMN "ads_type" text;--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "contacted_at" timestamp;--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "qualified_at" timestamp;--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "lost_at" timestamp;--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "lost_reason" text;--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "booking_outcome" text;