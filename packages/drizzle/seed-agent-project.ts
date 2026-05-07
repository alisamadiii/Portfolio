/**
 * Seed a test agent project for the islamic-portland-masjid repo.
 *
 * Usage:
 *   npx tsx seed-agent-project.ts <user-email>
 *
 * Example:
 *   npx tsx seed-agent-project.ts a@alisamadii.com
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./src/index";
import { agentProjects, user } from "./src/schema";

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx tsx seed-agent-project.ts <user-email>");
  process.exit(1);
}

async function seed() {
  const [foundUser] = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (!foundUser) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  const [existing] = await db
    .select()
    .from(agentProjects)
    .where(eq(agentProjects.userId, foundUser.id))
    .limit(1);

  if (existing) {
    console.log(`Project already exists for ${email}:`, existing.name);
    process.exit(0);
  }

  const [project] = await db
    .insert(agentProjects)
    .values({
      userId: foundUser.id,
      name: "Islamic Center of Portland",
      repoOwner: "alisamadiillc",
      repoName: "islamic-portland-masjid",
      productionUrl: "https://islamic-portland-masjid.vercel.app",
      previewUrl: "https://islamic-portland-masjid-git-preview-alisamadiillcs-projects.vercel.app",
      previewBranch: "preview",
      productionBranch: "main",
      allowedPaths: [
        "components/**",
        "app/**",
        "public/**",
        "lib/site.ts",
        "app/globals.css",
      ],
      framework: "nextjs",
      packageManager: "pnpm",
      status: "active",
    })
    .returning();

  console.log("Created project:", project);
  console.log("\nNext: create the 'preview' branch on GitHub:");
  console.log("  git checkout -b preview && git push -u origin preview");
}

seed().catch(console.error);
