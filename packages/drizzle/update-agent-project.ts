/**
 * Update existing agent project to match new schema.
 *
 * Usage:
 *   npx tsx update-agent-project.ts
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "./src/index";

async function update() {
  // First, check which columns exist
  const cols = await db.execute(sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'agent_projects'
    ORDER BY ordinal_position
  `);
  console.log("Current columns:", cols.rows.map((r: Record<string, unknown>) => r.column_name));

  // Add new columns if they don't exist
  const colNames = cols.rows.map((r: Record<string, unknown>) => r.column_name);

  if (!colNames.includes("framework")) {
    await db.execute(sql`ALTER TABLE agent_projects ADD COLUMN framework TEXT`);
    console.log("Added framework column");
  }

  if (!colNames.includes("package_manager")) {
    await db.execute(sql`ALTER TABLE agent_projects ADD COLUMN package_manager TEXT NOT NULL DEFAULT 'pnpm'`);
    console.log("Added package_manager column");
  }

  // Update existing records
  await db.execute(sql`
    UPDATE agent_projects
    SET framework = 'nextjs', package_manager = 'pnpm', updated_at = NOW()
    WHERE framework IS NULL
  `);
  console.log("Updated existing projects with framework=nextjs, packageManager=pnpm");

  // Verify
  const projects = await db.execute(sql`SELECT id, name, framework, package_manager FROM agent_projects`);
  console.log("Projects:", projects.rows);
}

update().catch(console.error);
