ALTER TABLE "hub_review_feedback" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hub_review_link" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agency_message" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "hub_review_feedback" CASCADE;--> statement-breakpoint
DROP TABLE "hub_review_link" CASCADE;--> statement-breakpoint
DROP TABLE "agency_message" CASCADE;--> statement-breakpoint
ALTER TABLE "agency_client" DROP CONSTRAINT "agency_client_sms_number_unique";--> statement-breakpoint
ALTER TABLE "hub_project" DROP COLUMN "usesend_domain_id";--> statement-breakpoint
ALTER TABLE "hub_project" DROP COLUMN "usesend_contact_book_id";--> statement-breakpoint
ALTER TABLE "hub_project" DROP COLUMN "gcal_connected_user_id";--> statement-breakpoint
ALTER TABLE "hub_project" DROP COLUMN "gcal_account_id";--> statement-breakpoint
ALTER TABLE "agency_client" DROP COLUMN "sms_number";--> statement-breakpoint
ALTER TABLE "agency_client" DROP COLUMN "sms_number_id";--> statement-breakpoint
ALTER TABLE "agency_client" DROP COLUMN "sms_profile_id";--> statement-breakpoint
ALTER TABLE "agency_lead" DROP COLUMN "meeting_event_id";--> statement-breakpoint
ALTER TABLE "agency_lead" DROP COLUMN "meeting_calendar_id";--> statement-breakpoint
ALTER TABLE "agency_lead" DROP COLUMN "meeting_at";--> statement-breakpoint
ALTER TABLE "agency_lead" DROP COLUMN "meeting_end_at";--> statement-breakpoint
ALTER TABLE "agency_lead" DROP COLUMN "meeting_url";--> statement-breakpoint
ALTER TABLE "agency_lead" DROP COLUMN "last_message_at";--> statement-breakpoint
ALTER TABLE "agency_lead" DROP COLUMN "starred";