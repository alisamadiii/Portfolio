import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

declare global {
  // eslint-disable-next-line no-var
  var __cmsNeonPool: Pool | undefined;
}

// The CMS needs interactive transactions (advisory locks in the folder
// cache), which the shared neon-http driver can't do — so it gets its own
// WebSocket pool against the same database.
const pool =
  globalThis.__cmsNeonPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") {
  globalThis.__cmsNeonPool = pool;
}

export const db = drizzle(pool, { schema });
