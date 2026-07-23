import { readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs in Node (not the Worker), so it won't see .dev.vars the way
// wrangler does. Prefer .dev.vars — that's the DB the Worker actually uses; a
// shell may export an unrelated DATABASE_URL from another project.
function loadDatabaseUrl(): string {
  try {
    const line = readFileSync(".dev.vars", "utf8")
      .split("\n")
      .find((l) => l.startsWith("DATABASE_URL="));
    // wrangler strips surrounding quotes from .dev.vars values; do the same.
    if (line)
      return line
        .slice("DATABASE_URL=".length)
        .trim()
        .replace(/^(["'])(.*)\1$/, "$2");
  } catch {
    /* .dev.vars missing — fall through */
  }
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  throw new Error("DATABASE_URL not set (.dev.vars or shell env).");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: loadDatabaseUrl(),
  },
});
