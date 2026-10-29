/**
 * One-time cutover helper (repoId -> projectId). Every project's useSend team
 * was created with externalId = String(repo_id); new teams use the project's
 * uuid. This re-keys the existing teams so the useSend Team.externalId matches
 * hub_project.id again. useSend has no update endpoint, so it writes the
 * useSend DB directly (USESEND_DATABASE_URL).
 *
 * Run from the repo root:
 *   USESEND_DATABASE_URL=postgres://... npx tsx packages/trpc/scripts/rekey-usesend-teams.mts            # dry run
 *   USESEND_DATABASE_URL=postgres://... npx tsx packages/trpc/scripts/rekey-usesend-teams.mts --commit   # real run
 */

import * as path from "path";
import * as dotenv from "dotenv";
import { isNotNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

dotenv.config({ path: path.resolve(process.cwd(), "apps/api/.env") });

const COMMIT = process.argv.includes("--commit");
const usesendUrl = process.env.USESEND_DATABASE_URL;
if (!usesendUrl) {
  console.error("USESEND_DATABASE_URL is not set");
  process.exit(1);
}

const { db } = await import("@workspace/drizzle/index");
const { hubProject } = await import("@workspace/drizzle/schema");
const usesend = drizzle(usesendUrl);

console.log(
  `useSend re-key ${COMMIT ? "(COMMIT)" : "(dry run)"} | hub: ${new URL(process.env.DATABASE_URL!).host} | useSend: ${new URL(usesendUrl).host}\n`
);

const projects = await db
  .select({
    id: hubProject.id,
    repo: hubProject.repo,
    teamId: hubProject.usesendTeamId,
  })
  .from(hubProject)
  .where(isNotNull(hubProject.usesendTeamId));

let changed = 0;
for (const project of projects) {
  const { rows } = await usesend.execute<{ externalId: string | null }>(
    sql`SELECT "externalId" FROM "Team" WHERE id = ${project.teamId}`
  );
  const team = rows[0];
  if (!team) {
    console.log(`  ! team ${project.teamId} (${project.repo}) not found in useSend`);
    continue;
  }
  if (team.externalId === project.id) continue;
  console.log(`  team ${project.teamId} (${project.repo}): ${team.externalId} -> ${project.id}`);
  changed++;
  if (COMMIT) {
    await usesend.execute(
      sql`UPDATE "Team" SET "externalId" = ${project.id} WHERE id = ${project.teamId}`
    );
  }
}

console.log(`\n${changed} team(s) ${COMMIT ? "re-keyed" : "would be re-keyed"}.`);
await usesend.$client.end();
process.exit(0);
