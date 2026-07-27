# Migrating agency-api to the portfolio Neon DB

The code in this app now reads the API tables (`api_keys`, `email_logs`,
`env_files`, `api_client_settings`) from the shared portfolio schema
(`@workspace/drizzle`). Identity is Better Auth's `user` table — the old
standalone `users` table is gone.

Nothing has been deployed. Production still runs the old code against the old
Neon project until you complete this checklist.

## Cutover checklist

1. **Push the schema** (adds 4 new tables — additive, existing portfolio
   tables untouched):

   ```sh
   cd packages/drizzle
   pnpm drizzle-kit push
   ```

2. **Copy the data** (idempotent, safe to re-run; never touches existing
   portfolio rows beyond setting `is_client` / `role` on matched accounts):

   ```sh
   cd apps/api
   OLD_DATABASE_URL="<old agency-api Neon URL>" \
   NEW_DATABASE_URL="<portfolio Neon URL>" \
   pnpm tsx scripts/migrate-api-db.ts
   ```

   Do **not** rotate `KEY_ENC_SECRET` — `secret_enc` values are copied as-is
   and must stay decryptable.

3. **Point the Worker at the portfolio DB:**

   ```sh
   cd apps/api
   wrangler secret put DATABASE_URL   # paste the portfolio Neon URL
   ```

   Also update `DATABASE_URL` in `apps/api/.dev.vars` for local dev.

4. **Deploy:**

   ```sh
   wrangler deploy
   ```

5. **Verify:**
   - `GET https://api.alisamadii.com/v1/admin/health` with an admin key — DB/KV/SES/R2 all ok.
   - `GET /v1/me` with an existing client key — proves key lookup + user join post-migration.
   - Send a test email through the portfolio (`AgencyClient` path).
   - Test an image upload (bucket now read from `api_client_settings`).
   - Portfolio admin: migrated clients visible with `isClient: true`.

6. **Old Neon project:** pause it for a week; delete once nothing breaks.

## What changed semantically

- Creating an API user (`POST /v1/admin/users`) for an email that already has
  a portfolio account **attaches API access** to that account instead of
  409ing. 409 only if the account already has API settings.
- Deleting an API user (`DELETE /v1/admin/users/:id`) removes API access
  (settings + keys) but keeps the portfolio account and its email/env audit
  rows.
- User ids in admin routes are Better Auth text ids, not UUIDs.
- Admin = `user.role === "admin"` (Better Auth role), formerly `users.type`.
