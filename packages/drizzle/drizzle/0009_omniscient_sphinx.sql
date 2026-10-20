CREATE TABLE "github_installation" (
	"id" serial PRIMARY KEY NOT NULL,
	"installation_id" integer NOT NULL,
	"account_login" text NOT NULL,
	"account_id" integer NOT NULL,
	"account_type" text NOT NULL,
	"sender_github_id" integer,
	"sender_login" text,
	"linked_user_id" text,
	"repository_selection" text DEFAULT 'selected' NOT NULL,
	"suspended_at" timestamp,
	"removed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "github_installation" ADD CONSTRAINT "github_installation_linked_user_id_user_id_fk" FOREIGN KEY ("linked_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_github_installation_installation_id" ON "github_installation" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "idx_github_installation_linked_user_id" ON "github_installation" USING btree ("linked_user_id");--> statement-breakpoint
CREATE INDEX "idx_github_installation_account_id" ON "github_installation" USING btree ("account_id");