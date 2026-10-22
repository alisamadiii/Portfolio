CREATE TABLE "agency_weekly_report" (
	"id" serial PRIMARY KEY NOT NULL,
	"repo_id" bigint NOT NULL,
	"week_from" text NOT NULL,
	"data" jsonb NOT NULL,
	"emailed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "agency_weekly_report_repo_week_idx" ON "agency_weekly_report" USING btree ("repo_id","week_from");