CREATE TABLE "hub_doordash_provision" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_enc" text NOT NULL,
	"stores" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub_doordash_store" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"store_id" text NOT NULL,
	"business_id" text,
	"business_name" text,
	"name" text NOT NULL,
	"address" text,
	"onboarding_id" text,
	"past_onboarding_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"onboarding_status" text DEFAULT 'PENDING' NOT NULL,
	"exclusion_code" text,
	"status_details" text,
	"menu_preview_url" text,
	"decision_maker_email" text,
	"connected_user_id" text,
	"last_event_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hub_uber_order" ADD COLUMN "merchant_promo_cents" integer;--> statement-breakpoint
ALTER TABLE "hub_uber_order" ADD COLUMN "merchant_fee_cents" integer;--> statement-breakpoint
ALTER TABLE "hub_uber_order" ADD COLUMN "tip_cents" integer;--> statement-breakpoint
ALTER TABLE "hub_uber_order" ADD COLUMN "uber_fee_cents" integer;--> statement-breakpoint
ALTER TABLE "hub_uber_order" ADD COLUMN "tax_merchant_cents" integer;--> statement-breakpoint
ALTER TABLE "hub_uber_store" ADD COLUMN "commission_bps" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hub_doordash_store_project" ON "hub_doordash_store" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hub_doordash_store_store" ON "hub_doordash_store" USING btree ("store_id");