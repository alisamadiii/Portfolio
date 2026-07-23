import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import type { Env } from "../env.js";

import * as schema from "./schema.js";

// Per-request Drizzle client over Neon's HTTP driver (fits Workers — no TCP,
// no connection pool to manage). Call once per request with c.env.
export function createDb(env: Env) {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL not configured (.dev.vars locally).");
  }
  const sql = neon(env.DATABASE_URL);
  return drizzle(sql, { schema });
}

export type Db = ReturnType<typeof createDb>;
export { schema };
