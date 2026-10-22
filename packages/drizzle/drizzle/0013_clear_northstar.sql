CREATE TABLE "agency_client" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"repo_id" bigint NOT NULL,
	"form_key" text NOT NULL,
	"google_ads_customer_id" text,
	"google_ads_conversion_action" text,
	"lead_notify_email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agency_client_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "agency_client_repo_id_unique" UNIQUE("repo_id"),
	CONSTRAINT "agency_client_form_key_unique" UNIQUE("form_key")
);
--> statement-breakpoint
CREATE TABLE "agency_lead" (
	"id" serial PRIMARY KEY NOT NULL,
	"repo_id" bigint NOT NULL,
	"name" text,
	"email" text,
	"phone" text,
	"message" text,
	"fields" jsonb,
	"form_name" text,
	"source" text DEFAULT 'form' NOT NULL,
	"page_url" text,
	"referrer" text,
	"utm" jsonb,
	"gclid" text,
	"gbraid" text,
	"wbraid" text,
	"status" text DEFAULT 'new' NOT NULL,
	"value_cents" integer,
	"currency" text DEFAULT 'USD' NOT NULL,
	"won_at" timestamp,
	"notes" text,
	"conversion_uploaded_at" timestamp,
	"conversion_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_client" ADD CONSTRAINT "agency_client_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agency_lead_repo_created_idx" ON "agency_lead" USING btree ("repo_id","created_at" DESC NULLS LAST);