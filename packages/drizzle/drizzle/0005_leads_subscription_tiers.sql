CREATE TABLE "price" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"recurring_interval" text,
	"active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "lead_credit_grant_uq";--> statement-breakpoint
CREATE INDEX "idx_price_product" ON "price" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_credit_grant_uq" ON "lead_credit_ledger" USING btree ("reason","ref_id") WHERE "lead_credit_ledger"."reason" in ('signup', 'purchase', 'refund', 'reset');