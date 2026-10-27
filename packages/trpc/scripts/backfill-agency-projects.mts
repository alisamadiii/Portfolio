/**
 * Every agency now lives inside a project (/p/[repoId]). Gives each agency
 * client without a hub_project row a starter project (one-page placeholder
 * index.html on content-pilot), reusing the client's existing tenant repoId so
 * its leads, reports and subscription stay keyed. Clients with no repoId at
 * all get a fresh synthetic one first.
 *
 * Run BEFORE migration 0031 (it makes agency_client.repo_id NOT NULL), once
 * per database (DATABASE_URL in packages/drizzle/.env; EDIT_TOKEN_SECRET +
 * CONTENT_PILOT_* in apps/api/.env decide where the site lands):
 *   npx tsx packages/trpc/scripts/backfill-agency-projects.mts
 * Idempotent: skips clients whose project already exists.
 */

import * as path from "path";
import * as dotenv from "dotenv";
import { eq, sql } from "drizzle-orm";

import { agencyClient, hubProject, user } from "@workspace/drizzle/schema";

dotenv.config({ path: path.resolve(process.cwd(), "packages/drizzle/.env") });
dotenv.config({ path: path.resolve(process.cwd(), "apps/api/.env") });
// The pool reads DATABASE_URL on import, so load it after dotenv.
const { db } = await import("@workspace/drizzle/pool");
const { pool } = await import("@workspace/drizzle/index");
const { createStarterProject } = await import("../src/lib/cms/upload-project");
const { syntheticRepoId } = await import("../src/lib/cms/upload-slug");

// Raw select: the schema already types repo_id NOT NULL, the DB may not yet.
const clients = await db
  .select({
    id: agencyClient.id,
    userId: agencyClient.userId,
    repoId: sql<number | null>`${agencyClient.repoId}`.mapWith(Number),
    name: user.name,
    email: user.email,
    projectRepoId: hubProject.repoId,
  })
  .from(agencyClient)
  .innerJoin(user, eq(user.id, agencyClient.userId))
  .leftJoin(hubProject, eq(hubProject.repoId, agencyClient.repoId));

let created = 0;
for (const client of clients) {
  if (client.projectRepoId) continue;

  let repoId = client.repoId || null;
  if (!repoId) {
    repoId = syntheticRepoId();
    await db.update(agencyClient).set({ repoId }).where(eq(agencyClient.id, client.id));
  }

  const name = client.name || client.email.split("@")[0] || "My business";
  const project = await createStarterProject({ userId: client.userId, name, repoId });
  created++;
  console.log(`client ${client.id} (${client.email}) → starter project ${project.name} (${project.repoId})`);
}

console.log(`Done. ${created} starter project(s) created, ${clients.length - created} already had one.`);
await pool.end();
