/**
 * `cms-bridge blog` — scaffold the hub blog sync into a client repo.
 *
 *   cms-bridge blog --repo-id 123456789
 *
 * Copies the blog-sync workflow + script templates (stamping the hub project's
 * GitHub-stable repo id into the content API URL), and ensures
 * src/content/blog/ exists. Idempotent: identical files are skipped; files
 * that differ from what would be written are reported, not overwritten
 * (pass --force to overwrite).
 *
 * Blog posts are edited in the hub only; the workflow mirrors published posts
 * into src/content/blog/ whenever the hub's "Publish to site" button fires a
 * blog-sync repository_dispatch. No secrets required — the content API is
 * public and serves published posts only.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";

const TEMPLATE_FILES = [
  { template: "blog-sync.yml", target: ".github/workflows/blog-sync.yml" },
  { template: "blog-sync.mjs", target: ".github/scripts/blog-sync.mjs" },
] as const;

const CONTENT_CONFIG_SNIPPET = `const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    coverImage: z.string().optional(),
    coverImageAlt: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});`;

/**
 * Load a raw (non-JSON) template shipped in the package's `templates/`
 * folder. Same resolution as core/manifest.ts loadTemplate: built CLI
 * (`dist/cli/index.js` → `../../templates`) and source during tests
 * (`src/cli/commands/*.ts` → `../../../templates`).
 */
function loadRawTemplate(name: string): string {
  for (const relative of [
    `../../templates/${name}`,
    `../../../templates/${name}`,
  ]) {
    try {
      const candidate = fileURLToPath(new URL(relative, import.meta.url));
      if (fs.existsSync(candidate)) return fs.readFileSync(candidate, "utf8");
    } catch {
      // keep looking
    }
  }
  throw new Error(`Template "${name}" missing from the cms-bridge package.`);
}

export function blogCommand(
  root: string,
  options: { repoId?: string | number; force?: boolean } = {}
): number {
  const repoId = Number(options.repoId);
  if (!options.repoId || !Number.isInteger(repoId) || repoId <= 0) {
    console.log(
      `${pc.red("✗")} Pass the hub project's repo id: ${pc.bold("cms-bridge blog --repo-id 123456789")}`
    );
    console.log(
      `  Find it in the hub (Site Settings › Blog) or via the GitHub API (repository "id").`
    );
    return 1;
  }

  let dirty = false;

  for (const { template, target } of TEMPLATE_FILES) {
    const content = loadRawTemplate(template).replaceAll(
      "__REPO_ID__",
      String(repoId)
    );
    const targetPath = path.join(root, target);
    const existing = fs.existsSync(targetPath)
      ? fs.readFileSync(targetPath, "utf8")
      : null;

    if (existing === content) {
      console.log(`${pc.green("✓")} ${target} up to date`);
      continue;
    }
    if (existing !== null && !options.force) {
      console.log(
        `${pc.yellow("!")} ${target} differs — left untouched (re-run with --force to overwrite)`
      );
      dirty = true;
      continue;
    }
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content);
    console.log(
      `${pc.green("✓")} ${existing === null ? "created" : "updated"} ${target}`
    );
  }

  const blogDir = path.join(root, "src", "content", "blog");
  if (!fs.existsSync(blogDir)) {
    fs.mkdirSync(blogDir, { recursive: true });
    fs.writeFileSync(path.join(blogDir, ".gitkeep"), "");
    console.log(`${pc.green("✓")} created src/content/blog/`);
  } else {
    console.log(`${pc.green("✓")} src/content/blog/ exists`);
  }

  const contentConfig = path.join(root, "src", "content.config.ts");
  const hasBlogCollection =
    fs.existsSync(contentConfig) &&
    fs.readFileSync(contentConfig, "utf8").includes("src/content/blog");
  if (!hasBlogCollection) {
    console.log(
      `\n${pc.yellow("!")} Add a ${pc.bold("blog")} collection to src/content.config.ts:\n`
    );
    console.log(CONTENT_CONFIG_SNIPPET);
    console.log(`\n  …and include it in the exported ${pc.bold("collections")}.`);
  }

  console.log(`
${pc.bold("Next steps")}
  1. Commit and push these files to the ${pc.bold("default branch")} —
     repository_dispatch only triggers workflows that live there.
  2. Build the blog pages (listing + [slug]) if the site doesn't have them.
  3. Publish from the hub: Site Settings › Blog › ${pc.bold("Publish to site")}.
`);

  return dirty ? 1 : 0;
}
