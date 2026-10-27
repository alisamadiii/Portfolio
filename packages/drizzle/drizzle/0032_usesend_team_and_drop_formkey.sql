ALTER TABLE "agency_client" DROP CONSTRAINT "agency_client_form_key_unique";--> statement-breakpoint
ALTER TABLE "hub_project" ADD COLUMN "usesend_team_id" integer;--> statement-breakpoint
ALTER TABLE "hub_project" ADD COLUMN "usesend_api_key" text;--> statement-breakpoint
ALTER TABLE "agency_client" DROP COLUMN "form_key";