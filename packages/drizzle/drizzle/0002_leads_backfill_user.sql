-- Backfill pre-SaaS leads data to the (single) admin user.
UPDATE "lead_scan"
SET "user_id" = (
  SELECT "id" FROM "user" WHERE "role" = 'admin' ORDER BY "created_at" ASC LIMIT 1
)
WHERE "user_id" IS NULL;
--> statement-breakpoint
UPDATE "lead"
SET "user_id" = (
  SELECT "id" FROM "user" WHERE "role" = 'admin' ORDER BY "created_at" ASC LIMIT 1
)
WHERE "user_id" IS NULL;
