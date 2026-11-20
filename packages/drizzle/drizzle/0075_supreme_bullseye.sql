CREATE TABLE "hub_shopify_store" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"shop_domain" text NOT NULL,
	"name" text NOT NULL,
	"currency" text,
	"timezone" text,
	"plan_name" text,
	"scope" text,
	"access_token_enc" text,
	"access_expires_at" timestamp,
	"refresh_token_enc" text,
	"refresh_expires_at" timestamp,
	"connected_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hub_shopify_store_project" ON "hub_shopify_store" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hub_shopify_store_shop" ON "hub_shopify_store" USING btree ("shop_domain");