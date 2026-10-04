/**
 * Applies pending SQL migrations from ./drizzle to DATABASE_URL.
 *
 * Runs in the api app's Docker build on Coolify (build script:
 * `pnpm --filter @workspace/drizzle migrate && next build`), so deploying
 * migrates the target DB — no SQL editor. Local workflow stays: edit schema
 * -> `pnpm db:generate` -> `pnpm db:migrate` (against the testing
 * DATABASE_URL) -> commit the generated drizzle/ files.
 *
 * Both existing DBs were baselined (0000_baseline marked as applied without
 * executing) since the schema predates the migration journal.
 */

import * as path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../.env") });

if (!process.env.DATABASE_URL) {
  console.error("[migrate] DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

console.log("[migrate] applying pending migrations...");
await migrate(db, { migrationsFolder: path.resolve(here, "../drizzle") });
console.log("[migrate] up to date");
await pool.end();
process.exit(0);
