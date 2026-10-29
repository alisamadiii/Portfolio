-- Rows whose project no longer exists (no hub_project match in 0038's backfill)
-- are unreachable from any UI; drop them so project_id can be NOT NULL.
DELETE FROM "agency_client" WHERE "project_id" IS NULL;--> statement-breakpoint
DELETE FROM "agency_lead" WHERE "project_id" IS NULL;--> statement-breakpoint
DELETE FROM "agency_weekly_report" WHERE "project_id" IS NULL;--> statement-breakpoint
ALTER TABLE "agency_client" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agency_lead" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agency_weekly_report" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "hub_collaborator" DROP COLUMN "repo_id";--> statement-breakpoint
ALTER TABLE "hub_collaborator_invite" DROP COLUMN "repo_id";--> statement-breakpoint
ALTER TABLE "agency_client" DROP COLUMN "repo_id";--> statement-breakpoint
ALTER TABLE "agency_lead" DROP COLUMN "repo_id";--> statement-breakpoint
ALTER TABLE "agency_weekly_report" DROP COLUMN "repo_id";