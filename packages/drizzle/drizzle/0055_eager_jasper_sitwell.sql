ALTER TABLE "partner_referral" DROP CONSTRAINT "partner_referral_agency_client_id_agency_client_id_fk";
--> statement-breakpoint
ALTER TABLE "partner_referral" DROP COLUMN "agency_client_id";