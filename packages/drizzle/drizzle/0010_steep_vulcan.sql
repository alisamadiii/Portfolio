ALTER TABLE "subscription" ALTER COLUMN "repo_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "hub_collaborator" ALTER COLUMN "repo_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "hub_collaborator_invite" ALTER COLUMN "repo_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "hub_project" ALTER COLUMN "repo_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "hub_project" ADD COLUMN "source" text DEFAULT 'github' NOT NULL;