CREATE TABLE "partner" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"code" text,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"occupation" text NOT NULL,
	"city" text NOT NULL,
	"know_owners" text NOT NULL,
	"why_join" text NOT NULL,
	"agreement_version" text NOT NULL,
	"signature" text NOT NULL,
	"initials" text NOT NULL,
	"signed_at" timestamp NOT NULL,
	"signed_ip" text,
	"user_agent" text,
	"pdf_token" text NOT NULL,
	"agreement_key" text,
	"payout_method" text,
	"notes" text,
	"approved_at" timestamp,
	"rejected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "partner_code_unique" UNIQUE("code"),
	CONSTRAINT "partner_pdf_token_unique" UNIQUE("pdf_token")
);
--> statement-breakpoint
CREATE TABLE "partner_referral" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" uuid NOT NULL,
	"agency_client_id" integer,
	"business_name" text NOT NULL,
	"contact_name" text,
	"email" text,
	"phone" text,
	"notes" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"client_paid_cents" integer,
	"client_paid_at" timestamp,
	"commission_cents" integer,
	"partner_paid_at" timestamp,
	"payout_reference" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "partner_referral" ADD CONSTRAINT "partner_referral_partner_id_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partner"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_referral" ADD CONSTRAINT "partner_referral_agency_client_id_agency_client_id_fk" FOREIGN KEY ("agency_client_id") REFERENCES "public"."agency_client"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_partner_email" ON "partner" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_partner_status" ON "partner" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_partner_referral_partner" ON "partner_referral" USING btree ("partner_id");