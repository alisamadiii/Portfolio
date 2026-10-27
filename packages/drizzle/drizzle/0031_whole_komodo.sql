ALTER TABLE "agency_client" DROP CONSTRAINT "agency_client_user_id_unique";--> statement-breakpoint
ALTER TABLE "agency_client" ALTER COLUMN "repo_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_agency_client_user" ON "agency_client" USING btree ("user_id");