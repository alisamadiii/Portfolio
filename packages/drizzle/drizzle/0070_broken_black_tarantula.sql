ALTER TABLE "hub_review_link" ALTER COLUMN "place_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "hub_review_link" ALTER COLUMN "business_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "hub_project" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "hub_project" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "hub_project" ADD COLUMN "hours" text;--> statement-breakpoint
ALTER TABLE "hub_project" ADD COLUMN "google_place_id" text;--> statement-breakpoint
ALTER TABLE "hub_project" ADD COLUMN "google_review_url" text;