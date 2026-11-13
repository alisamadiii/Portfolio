CREATE TABLE "agency_template" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"duration_minutes" integer,
	"body" text DEFAULT '' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "meeting_event_id" text;--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "meeting_calendar_id" text;--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "meeting_at" timestamp;--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "meeting_end_at" timestamp;--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "meeting_url" text;--> statement-breakpoint
ALTER TABLE "agency_template" ADD CONSTRAINT "agency_template_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agency_template_project_idx" ON "agency_template" USING btree ("project_id","kind");