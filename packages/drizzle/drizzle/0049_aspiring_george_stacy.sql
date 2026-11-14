ALTER TABLE "hub_project" ADD COLUMN "wix_instance_id" text;--> statement-breakpoint
ALTER TABLE "hub_project" ADD COLUMN "wix_site_id" text;--> statement-breakpoint
ALTER TABLE "hub_project" ADD COLUMN "wix_connected_user_id" text;--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "external_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hub_project_wix_instance" ON "hub_project" USING btree ("wix_instance_id") WHERE "hub_project"."wix_instance_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_agency_lead_project_external" ON "agency_lead" USING btree ("project_id","external_id") WHERE "agency_lead"."external_id" is not null;