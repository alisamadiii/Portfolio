CREATE TABLE "agency_rate_limit" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp DEFAULT now() NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "agency_rate_limit_window_start_idx" ON "agency_rate_limit" USING btree ("window_start");