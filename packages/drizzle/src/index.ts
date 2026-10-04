import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

/**
 * Single node-postgres pool for the whole process. The DB is self-hosted
 * Postgres (Coolify, same docker network) reached over the plain wire
 * protocol — no Neon HTTP shim. SSL is driven by the connection string
 * (sslmode=...), so internal/tunnel URLs stay unencrypted and any remote URL
 * that asks for SSL still gets it.
 */
const pool =
  globalThis.__pgPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") {
  globalThis.__pgPool = pool;
}

export { pool };
export const db = drizzle(pool);
