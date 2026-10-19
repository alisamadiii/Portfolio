CREATE TABLE "lead_workspace" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"lead_id" integer NOT NULL,
	"lat" real,
	"lng" real,
	"visit_status" text DEFAULT 'pending' NOT NULL,
	"outcome" text,
	"visited_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "lead_workspace" ADD CONSTRAINT "lead_workspace_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_workspace" ADD CONSTRAINT "lead_workspace_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_workspace_user_idx" ON "lead_workspace" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_workspace_user_lead_uq" ON "lead_workspace" USING btree ("user_id","lead_id");