CREATE TYPE "public"."projects_type" AS ENUM('PORTFOLIO', 'DOCS', 'MOTION', 'AGENCY', 'TEMPLATE', 'ADMIN', 'SAASKIT', 'CMS', 'LEADS');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	"active_organization_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"role" text,
	"banned" boolean,
	"ban_reason" text,
	"ban_expires" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"phone" text,
	"company" text,
	"address" text,
	"stripe_customer_id" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"email" text NOT NULL,
	"product_id" text NOT NULL,
	"billing_name" text NOT NULL,
	"subscription_id" text NOT NULL,
	"billing_reason" text NOT NULL,
	"total_amount" integer NOT NULL,
	"invoice_number" text NOT NULL,
	"status" text NOT NULL,
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trial_interval" text,
	"trial_interval_count" integer DEFAULT 0,
	"popular" boolean DEFAULT false NOT NULL,
	"price_amount" integer NOT NULL,
	"price_currency" text DEFAULT 'usd' NOT NULL,
	"recurring_interval" text,
	"is_recurring" boolean DEFAULT true NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"stripe_price_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"email" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"product_id" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	"trial_start" timestamp,
	"trial_end" timestamp,
	"started_at" timestamp,
	"canceled_at" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"recurring_interval" text,
	"customer_cancellation_reason" text,
	"customer_cancellation_comment" text,
	"repo_id" integer,
	"plan" text,
	"stripe_customer_id" text,
	"price_id" text,
	"current_period_end" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub_cache_file" (
	"id" serial PRIMARY KEY NOT NULL,
	"context" text DEFAULT 'collection' NOT NULL,
	"owner" text NOT NULL,
	"repo" text NOT NULL,
	"branch" text NOT NULL,
	"parent_path" text NOT NULL,
	"name" text NOT NULL,
	"path" text NOT NULL,
	"type" text NOT NULL,
	"content" text,
	"sha" text,
	"size" integer,
	"download_url" text,
	"commit_sha" text,
	"commit_timestamp" timestamp,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub_cache_file_meta" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner" text NOT NULL,
	"repo" text NOT NULL,
	"branch" text NOT NULL,
	"path" text DEFAULT '' NOT NULL,
	"context" text DEFAULT 'branch' NOT NULL,
	"commit_sha" text,
	"commit_timestamp" timestamp,
	"status" text DEFAULT 'ok' NOT NULL,
	"error" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_checked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub_collaborator" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"owner_id" integer,
	"repo_id" integer,
	"owner" text NOT NULL,
	"repo" text NOT NULL,
	"branch" text,
	"email" text NOT NULL,
	"user_id" text,
	"invited_by" text,
	"role" text DEFAULT 'full-access' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub_collaborator_invite" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"email" text NOT NULL,
	"repo_id" integer,
	"owner" text NOT NULL,
	"repo" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner" text NOT NULL,
	"repo" text NOT NULL,
	"branch" text NOT NULL,
	"sha" text NOT NULL,
	"version" text NOT NULL,
	"object" text NOT NULL,
	"last_checked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub_project" (
	"id" serial PRIMARY KEY NOT NULL,
	"repo_id" integer NOT NULL,
	"owner" text NOT NULL,
	"repo" text NOT NULL,
	"private" boolean DEFAULT false NOT NULL,
	"default_branch" text NOT NULL,
	"github_updated_at" timestamp NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"base_path" text DEFAULT '' NOT NULL,
	"media_provider" text DEFAULT 'imagekit' NOT NULL,
	"free_life" boolean DEFAULT false NOT NULL,
	"blog_edited_at" timestamp,
	"blog_published_at" timestamp,
	"usesend_domain_id" text,
	"usesend_pending_domain_id" text,
	"ga_property_id" text,
	"ga_connected_user_id" text,
	"website_url" text,
	"github_connected_user_id" text,
	"hidden" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monitor_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"check_id" text NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"ok" boolean NOT NULL,
	"http_status" integer,
	"latency_ms" integer,
	"detail" text,
	"probes" jsonb
);
--> statement-breakpoint
CREATE TABLE "short_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"url" text NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "short_link_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"is_private" boolean DEFAULT true NOT NULL,
	"image_url" text,
	"dark_image_url" text,
	"video_url" text,
	"dark_video_url" text,
	"from" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "source_file" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"index" integer DEFAULT 0 NOT NULL,
	"source_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"path" text,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lead" (
	"id" serial PRIMARY KEY NOT NULL,
	"scan_id" integer NOT NULL,
	"place_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"website" text,
	"social_only" boolean DEFAULT false NOT NULL,
	"website_dead" boolean DEFAULT false NOT NULL,
	"distance_miles" real,
	"rating" real,
	"review_count" integer DEFAULT 0 NOT NULL,
	"maps_url" text,
	"category" text,
	"score" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "lead_place_id_unique" UNIQUE("place_id")
);
--> statement-breakpoint
CREATE TABLE "lead_scan" (
	"id" serial PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"near_me" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_found" integer DEFAULT 0 NOT NULL,
	"no_website_count" integer DEFAULT 0 NOT NULL,
	"api_calls" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hub_collaborator" ADD CONSTRAINT "hub_collaborator_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hub_collaborator" ADD CONSTRAINT "hub_collaborator_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_file" ADD CONSTRAINT "source_file_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_scan_id_lead_scan_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."lead_scan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_subscription_repo_id" ON "subscription" USING btree ("repo_id") WHERE "subscription"."repo_id" is not null;--> statement-breakpoint
CREATE INDEX "idx_subscription_customer" ON "subscription" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "idx_hub_cache_file_owner_repo_branch_parent_path" ON "hub_cache_file" USING btree ("owner","repo","branch","parent_path");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_hub_cache_file_owner_repo_branch_path" ON "hub_cache_file" USING btree ("owner","repo","branch","path");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_hub_cache_file_meta_owner_repo_branch_path_context" ON "hub_cache_file_meta" USING btree ("owner","repo","branch","path","context");--> statement-breakpoint
CREATE INDEX "idx_hub_collaborator_owner_repo_email" ON "hub_collaborator" USING btree ("owner","repo","email");--> statement-breakpoint
CREATE INDEX "idx_hub_collaborator_user_id" ON "hub_collaborator" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_hub_collaborator_repo_id" ON "hub_collaborator" USING btree ("repo_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hub_collaborator_owner_repo_email_ci" ON "hub_collaborator" USING btree (lower("owner"),lower("repo"),lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hub_collaborator_invite_token" ON "hub_collaborator_invite" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_hub_collaborator_invite_owner_repo_email" ON "hub_collaborator_invite" USING btree ("owner","repo","email");--> statement-breakpoint
CREATE INDEX "idx_hub_collaborator_invite_repo_id" ON "hub_collaborator_invite" USING btree ("repo_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hub_collaborator_invite_owner_repo_email_ci" ON "hub_collaborator_invite" USING btree (lower("owner"),lower("repo"),lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "idx_hub_config_owner_repo_branch" ON "hub_config" USING btree ("owner","repo","branch");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hub_project_repo_id" ON "hub_project" USING btree ("repo_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hub_project_owner_repo_ci" ON "hub_project" USING btree (lower("owner"),lower("repo"));--> statement-breakpoint
CREATE INDEX "monitor_log_run_at_idx" ON "monitor_log" USING btree ("run_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "monitor_log_check_idx" ON "monitor_log" USING btree ("check_id","run_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "lead_scan_id_idx" ON "lead" USING btree ("scan_id");--> statement-breakpoint
CREATE INDEX "lead_score_idx" ON "lead" USING btree ("score" DESC NULLS LAST);