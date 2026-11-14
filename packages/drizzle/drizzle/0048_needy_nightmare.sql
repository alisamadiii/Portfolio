ALTER TABLE "hub_project" ADD COLUMN "neon_connected_user_id" text;--> statement-breakpoint
ALTER TABLE "hub_project" ADD COLUMN "neon_account_id" text;--> statement-breakpoint
ALTER TABLE "hub_project" ADD COLUMN "neon_project_id" text;--> statement-breakpoint
ALTER TABLE "hub_project" ADD COLUMN "neon_org_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hub_project_neon_project" ON "hub_project" USING btree ("neon_project_id") WHERE "hub_project"."neon_project_id" is not null;