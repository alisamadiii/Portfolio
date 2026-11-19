CREATE TABLE "hub_uber_order" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"store_id" text NOT NULL,
	"display_id" text NOT NULL,
	"state" text NOT NULL,
	"type" text NOT NULL,
	"placed_at" timestamp NOT NULL,
	"ready_at" timestamp,
	"eater_first_name" text,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"subtotal_cents" integer,
	"tax_cents" integer,
	"total_cents" integer,
	"currency" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub_uber_provision" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_enc" text NOT NULL,
	"stores" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub_uber_store" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"store_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"timezone" text,
	"web_url" text,
	"listing_status" text,
	"online_status" text,
	"paused_until" timestamp,
	"offline_reason" text,
	"integration_enabled" boolean DEFAULT true NOT NULL,
	"provisioned_at" timestamp,
	"deprovisioned_at" timestamp,
	"connected_user_id" text,
	"last_synced_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hub_uber_order_project_placed_idx" ON "hub_uber_order" USING btree ("project_id","placed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hub_uber_store_project" ON "hub_uber_store" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hub_uber_store_store" ON "hub_uber_store" USING btree ("store_id");