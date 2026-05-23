import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ override: true });

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
