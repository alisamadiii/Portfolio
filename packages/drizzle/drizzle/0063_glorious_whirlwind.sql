CREATE TABLE "hub_review_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"link_id" text NOT NULL,
	"rating" smallint NOT NULL,
	"message" text,
	"name" text,
	"contact" text,
	"went_to_google" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub_review_link" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"place_id" text NOT NULL,
	"business_name" text NOT NULL,
	"address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hub_review_link_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
ALTER TABLE "hub_project" ADD COLUMN "logo_key" text;--> statement-breakpoint
CREATE INDEX "hub_review_feedback_project_created_idx" ON "hub_review_feedback" USING btree ("project_id","created_at");