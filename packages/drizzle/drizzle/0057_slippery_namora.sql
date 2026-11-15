CREATE TABLE "agency_message" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"lead_id" integer NOT NULL,
	"channel" text NOT NULL,
	"direction" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"subject" text,
	"media_urls" jsonb,
	"status" text NOT NULL,
	"error" text,
	"provider_id" text,
	"sent_by" text,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_client" ADD COLUMN "sms_number" text;--> statement-breakpoint
ALTER TABLE "agency_client" ADD COLUMN "sms_number_id" text;--> statement-breakpoint
ALTER TABLE "agency_client" ADD COLUMN "sms_profile_id" text;--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "last_message_at" timestamp;--> statement-breakpoint
ALTER TABLE "agency_lead" ADD COLUMN "starred" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "agency_message" ADD CONSTRAINT "agency_message_lead_id_agency_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."agency_lead"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_message" ADD CONSTRAINT "agency_message_sent_by_user_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agency_message_lead_idx" ON "agency_message" USING btree ("project_id","lead_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_agency_message_provider" ON "agency_message" USING btree ("provider_id") WHERE "agency_message"."provider_id" is not null;--> statement-breakpoint
ALTER TABLE "agency_client" ADD CONSTRAINT "agency_client_sms_number_unique" UNIQUE("sms_number");