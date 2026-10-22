CREATE TABLE "agency_ads_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"key" text NOT NULL,
	"data" jsonb NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "landing_page" text;--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "first_touch" jsonb;--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "click_at" timestamp;--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "channel" text;--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "ad_click" jsonb;--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "ad_click_checked_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "agency_ads_cache_customer_key_idx" ON "agency_ads_cache" USING btree ("customer_id","key");--> statement-breakpoint
CREATE INDEX "agency_lead_repo_channel_created_idx" ON "agency_lead" USING btree ("repo_id","channel","created_at" DESC NULLS LAST);