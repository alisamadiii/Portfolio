ALTER TABLE "project_offer" ALTER COLUMN "stripe_price_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project_offer" ADD COLUMN "items" jsonb DEFAULT '[]'::jsonb NOT NULL;