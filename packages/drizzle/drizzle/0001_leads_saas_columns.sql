CREATE TABLE "lead_credit_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"ref_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead" DROP CONSTRAINT "lead_place_id_unique";--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "unlocked" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "lead_scan" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "lead_credit_ledger" ADD CONSTRAINT "lead_credit_ledger_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_credit_user_idx" ON "lead_credit_ledger" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_credit_grant_uq" ON "lead_credit_ledger" USING btree ("reason","ref_id") WHERE "lead_credit_ledger"."reason" in ('signup', 'purchase', 'refund');--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_scan" ADD CONSTRAINT "lead_scan_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_user_idx" ON "lead" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lead_scan_user_idx" ON "lead_scan" USING btree ("user_id","created_at" DESC NULLS LAST);