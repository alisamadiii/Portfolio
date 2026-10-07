ALTER TABLE "lead" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "lead_scan" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "lead_user_place_uq" ON "lead" USING btree ("user_id","place_id");