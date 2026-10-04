/**
 * Applies pending SQL migrations from ./drizzle to DATABASE_URL.
 *
 * Runs automatically in the api app's build on Vercel PRODUCTION deploys
 * (gated below), so pushing to main migrates the prod DB — no SQL editor.
 * Local workflow stays: edit schema -> `pnpm db:generate` -> `pnpm db:migrate`
 * (against the testing DATABASE_URL) -> commit the generated drizzle/ files.
 *
 * Both existing DBs were baselined (0000_baseline marked as applied without
 * executing) since the schema predates the migration journal.
 */

import * as path from "path";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../.env") });

const isVercel = !!process.env.VERCEL;
const isProd = process.env.VERCEL_ENV === "production";

// On Vercel, only production deploys migrate (previews must never touch the
// prod DB). Locally (no VERCEL) it always runs — that's `pnpm db:migrate`
// against the testing DATABASE_URL.
if (isVercel && !isProd) {
  console.log(`[migrate] skipped (VERCEL_ENV=${process.env.VERCEL_ENV})`);
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("[migrate] DATABASE_URL is not set");
  process.exit(1);
}

const db = drizzle(neon(process.env.DATABASE_URL));

console.log(`[migrate] applying pending migrations${isProd ? " (production)" : ""}...`);
await migrate(db, { migrationsFolder: path.resolve(here, "../drizzle") });
console.log("[migrate] up to date");
process.exit(0);
