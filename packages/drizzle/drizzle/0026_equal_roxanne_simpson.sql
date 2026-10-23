-- Data-preserving: copy each per-tenant sub's repoId (and userId) into
-- metadata BEFORE the column is dropped, so access is never lost. Runs in the
-- same migration transaction as the drop. Idempotent.
UPDATE "subscription"
SET metadata = COALESCE(metadata, '{}'::jsonb)
  || jsonb_build_object('repoId', repo_id::text, 'userId', user_id)
WHERE repo_id IS NOT NULL
  AND (metadata ->> 'repoId') IS DISTINCT FROM repo_id::text;--> statement-breakpoint
DROP INDEX "uq_subscription_repo_id";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "repo_id";