/**
 * One-time cutover helper (repoId -> projectId). Prints the
 * { "<old repo_id>": "<hub_project.id>" } map that content-pilot's
 * scripts/migrate-project-ids.ts consumes to rename its workspace dirs,
 * session rows and settings keys. Run AFTER the hub migrations (0038/0039)
 * have applied to the target DB.
 *
 * Run from the repo root:
 *   npx tsx packages/trpc/scripts/export-project-map.mts > map.json
 */

import * as path from "path";
import * as dotenv from "dotenv";
import { isNotNull } from "drizzle-orm";

dotenv.config({ path: path.resolve(process.cwd(), "apps/api/.env") });

const { db } = await import("@workspace/drizzle/index");
const { hubProject } = await import("@workspace/drizzle/schema");

const rows = await db
  .select({ id: hubProject.id, repoId: hubProject.repoId })
  .from(hubProject)
  .where(isNotNull(hubProject.repoId));

const map = Object.fromEntries(rows.map((row) => [String(row.repoId), row.id]));
console.error(
  `${rows.length} projects | DB: ${new URL(process.env.DATABASE_URL!).host}`
);
console.log(JSON.stringify(map, null, 2));
process.exit(0);
