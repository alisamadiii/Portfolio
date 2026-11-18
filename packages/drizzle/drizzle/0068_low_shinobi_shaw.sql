CREATE TABLE "hub_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"review_id" text NOT NULL,
	"author_name" text NOT NULL,
	"author_photo_url" text,
	"rating" smallint NOT NULL,
	"text" text NOT NULL,
	"published_at" timestamp NOT NULL,
	"owner_reply" text,
	"owner_reply_at" timestamp,
	"review_url" text,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub_reviews_source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"url" text NOT NULL,
	"external_id" text,
	"business_name" text,
	"rating" real,
	"total_reviews" integer,
	"first_synced_at" timestamp,
	"last_synced_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hub_review_project_provider_review" ON "hub_review" USING btree ("project_id","provider","review_id");--> statement-breakpoint
CREATE INDEX "hub_review_project_published_idx" ON "hub_review" USING btree ("project_id","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hub_reviews_source_project_provider" ON "hub_reviews_source" USING btree ("project_id","provider");