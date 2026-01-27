import { drizzle } from "drizzle-orm/neon-http";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

/**
 * Drizzle database instance configured with Neon HTTP driver
 * Provides database connection and query capabilities for the application
 */
export const db = drizzle(process.env.DATABASE_URL);
