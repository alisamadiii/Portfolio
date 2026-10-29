ALTER TABLE "agency_client" DROP CONSTRAINT "agency_client_repo_id_unique";--> statement-breakpoint
DROP INDEX "idx_subscription_meta_repo";--> statement-breakpoint
DROP INDEX "uq_subscription_meta_repo";--> statement-breakpoint
DROP INDEX "idx_hub_collaborator_repo_id";--> statement-breakpoint
DROP INDEX "uq_hub_collaborator_owner_repo_email_ci";--> statement-breakpoint
DROP INDEX "idx_hub_collaborator_invite_repo_id";--> statement-breakpoint
DROP INDEX "uq_hub_collaborator_invite_owner_repo_email_ci";--> statement-breakpoint
DROP INDEX "uq_hub_project_repo_id";--> statement-breakpoint
DROP INDEX "agency_lead_repo_created_idx";--> statement-breakpoint
DROP INDEX "agency_lead_repo_channel_created_idx";--> statement-breakpoint
DROP INDEX "agency_lead_repo_booking_at_idx";--> statement-breakpoint
DROP INDEX "agency_weekly_report_repo_week_idx";--> statement-breakpoint
DROP INDEX "uq_hub_project_owner_repo_ci";--> statement-breakpoint
ALTER TABLE "hub_project" ALTER COLUMN "repo_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "agency_client" ALTER COLUMN "repo_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "agency_lead" ALTER COLUMN "repo_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "agency_weekly_report" ALTER COLUMN "repo_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "hub_collaborator" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "hub_collaborator_invite" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "agency_client" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "agency_weekly_report" ADD COLUMN "project_id" uuid;--> statement-breakpoint
-- Backfill: project identity moves from hub_project.repo_id to hub_project.id.
UPDATE "hub_collaborator" c SET "project_id" = p."id" FROM "hub_project" p WHERE p."repo_id" = c."repo_id";--> statement-breakpoint
UPDATE "hub_collaborator_invite" c SET "project_id" = p."id" FROM "hub_project" p WHERE p."repo_id" = c."repo_id";--> statement-breakpoint
UPDATE "agency_client" c SET "project_id" = p."id" FROM "hub_project" p WHERE p."repo_id" = c."repo_id";--> statement-breakpoint
UPDATE "agency_lead" c SET "project_id" = p."id" FROM "hub_project" p WHERE p."repo_id" = c."repo_id";--> statement-breakpoint
UPDATE "agency_weekly_report" c SET "project_id" = p."id" FROM "hub_project" p WHERE p."repo_id" = c."repo_id";--> statement-breakpoint
UPDATE "subscription" s SET "metadata" = (s."metadata" - 'repoId' - 'repo_id') || jsonb_build_object('projectId', p."id"::text) FROM "hub_project" p WHERE COALESCE(s."metadata" ->> 'repoId', s."metadata" ->> 'repo_id') = p."repo_id"::text;--> statement-breakpoint
CREATE INDEX "idx_subscription_meta_project" ON "subscription" USING btree (("metadata" ->> 'projectId'));--> statement-breakpoint
CREATE UNIQUE INDEX "uq_subscription_meta_project" ON "subscription" USING btree (("metadata" ->> 'projectId')) WHERE "subscription"."metadata" ->> 'projectId' is not null;--> statement-breakpoint
CREATE INDEX "idx_hub_collaborator_project_id" ON "hub_collaborator" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hub_collaborator_project_email_ci" ON "hub_collaborator" USING btree ("project_id",lower("email"));--> statement-breakpoint
CREATE INDEX "idx_hub_collaborator_invite_project_id" ON "hub_collaborator_invite" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hub_collaborator_invite_project_email_ci" ON "hub_collaborator_invite" USING btree ("project_id",lower("email"));--> statement-breakpoint
CREATE INDEX "agency_lead_project_created_idx" ON "agency_lead" USING btree ("project_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "agency_lead_project_channel_created_idx" ON "agency_lead" USING btree ("project_id","channel","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "agency_lead_project_booking_at_idx" ON "agency_lead" USING btree ("project_id","booking_at") WHERE "agency_lead"."booking_canceled_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "agency_weekly_report_project_week_idx" ON "agency_weekly_report" USING btree ("project_id","week_from");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hub_project_owner_repo_ci" ON "hub_project" USING btree (lower("owner"),lower("repo")) WHERE "hub_project"."source" = 'upload';--> statement-breakpoint
ALTER TABLE "agency_client" ADD CONSTRAINT "agency_client_project_id_unique" UNIQUE("project_id");