CREATE TABLE "project_offer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"plan" text NOT NULL,
	"name" text NOT NULL,
	"amount" integer NOT NULL,
	"interval" text NOT NULL,
	"setup_amount" integer,
	"currency" text DEFAULT 'usd' NOT NULL,
	"stripe_price_id" text NOT NULL,
	"stripe_setup_price_id" text,
	"stripe_payment_link_id" text NOT NULL,
	"url" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp
);
--> statement-breakpoint
CREATE INDEX "idx_project_offer_project" ON "project_offer" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_project_offer_open" ON "project_offer" USING btree ("project_id") WHERE "project_offer"."status" = 'open';