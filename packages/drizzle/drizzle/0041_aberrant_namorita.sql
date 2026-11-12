ALTER TABLE "hub_cache_file" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agency_weekly_report" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "hub_cache_file" CASCADE;--> statement-breakpoint
DROP TABLE "agency_weekly_report" CASCADE;--> statement-breakpoint
DROP INDEX "agency_lead_project_booking_at_idx";--> statement-breakpoint
ALTER TABLE "hub_collaborator" DROP COLUMN "owner_id";--> statement-breakpoint
ALTER TABLE "hub_collaborator" DROP COLUMN "branch";--> statement-breakpoint
ALTER TABLE "hub_project" DROP COLUMN "blog_edited_at";--> statement-breakpoint
ALTER TABLE "hub_project" DROP COLUMN "blog_published_at";--> statement-breakpoint
ALTER TABLE "hub_project" DROP COLUMN "usesend_domain_id";--> statement-breakpoint
ALTER TABLE "hub_project" DROP COLUMN "usesend_pending_domain_id";--> statement-breakpoint
ALTER TABLE "agency_client" DROP COLUMN "weekly_report";--> statement-breakpoint
ALTER TABLE "agency_client" DROP COLUMN "booking_settings";--> statement-breakpoint
ALTER TABLE "agency_lead" DROP COLUMN "booking_at";--> statement-breakpoint
ALTER TABLE "agency_lead" DROP COLUMN "booking_end";--> statement-breakpoint
ALTER TABLE "agency_lead" DROP COLUMN "booking_canceled_at";--> statement-breakpoint
ALTER TABLE "agency_lead" DROP COLUMN "booking";--> statement-breakpoint
ALTER TABLE "agency_lead" DROP COLUMN "booking_outcome";