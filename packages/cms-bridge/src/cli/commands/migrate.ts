/**
 * cms-bridge migrate — convert a legacy `.pages.yml` project to the CMS v2
 * three-file contract:
 *
 *   src/data/cms.json    manifest (baseUrl, media, pages, collections)
 *   src/data/pages.json  every page entry's JSON merged under its entry name
 *   src/data/site.json   untouched
 *
 * Also rewrites `import x from ".../data/<page>.json"` imports to read from
 * the merged pages.json. Legacy files are KEPT by default for rollback —
 * pass --delete-legacy to remove `.pages.yml` and the per-page JSONs once
 * the v2 canvas round-trips.
 */

import { existsSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

import pc from "picocolors";
import YAML from "yaml";

type MigrateOptions = {
  dryRun?: boolean;
  deleteLegacy?: boolean;
};

type FileEntry = {
  name: string;
  label?: string;
  path: string;
  fields?: Array<Record<string, any>>;
};

type CollectionEntry = {
  name: string;
  label?: string;
  path: string;
  fields?: Array<Record<string, any>>;
};

const SCALAR_TYPES = new Set([
  "string",
  "text",
  "image",
  "date",
  "boolean",
  "number",
  "select",
]);

/** Flatten `content` (groups included) into file/collection entries. */
function flattenContent(content: unknown): {
  files: FileEntry[];
  collections: CollectionEntry[];
} {
  const files: FileEntry[] = [];
  const collections: CollectionEntry[] = [];
  const visit = (items: unknown) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const node = item as Record<string, any>;
      if (node.type === "group") {
        visit(node.items);
        continue;
      }
      if (typeof node.name !== "string" || typeof node.path !== "string")
        continue;
      if (node.type === "file")
        files.push({
          name: node.name,
          label: typeof node.label === "string" ? node.label : undefined,
          path: node.path,
          fields: node.fields,
        });
      else if (node.type === "collection")
        collections.push({
          name: node.name,
          label: node.label,
          path: node.path,
          fields: node.fields,
        });
    }
  };
  visit(content);
  return { files, collections };
}

/** Legacy collection schema → the small v2 declaration (scalar fields only). */
function declarationFields(
  fields: Array<Record<string, any>> | undefined
): Array<Record<string, any>> {
  const out: Array<Record<string, any>> = [];
  for (const field of fields ?? []) {
    if (typeof field?.name !== "string") continue;
    if (field.name === "body" || field.name === "seo") continue;
    const type = typeof field.type === "string" ? field.type : "string";
    if (!SCALAR_TYPES.has(type)) continue;
    const declared: Record<string, any> = { name: field.name, type };
    if (field.required === true) declared.required = true;
    if (typeof field.label === "string") declared.label = field.label;
    const values = field.options?.values;
    if (type === "select" && Array.isArray(values)) declared.options = values;
    out.push(declared);
  }
  return out;
}

/** Walk src/ for source files that may import page JSONs. */
function sourceFiles(root: string): string[] {
  const out: string[] = [];
  const visit = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) visit(full);
      else if (/\.(astro|ts|tsx|js|mjs)$/.test(name)) out.push(full);
    }
  };
  const src = join(root, "src");
  if (existsSync(src)) visit(src);
  return out;
}

export async function migrateCommand(
  root: string,
  options: MigrateOptions = {}
): Promise<number> {
  const dryRun = options.dryRun === true;
  const configPath = join(root, ".pages.yml");
  const cmsJsonPath = join(root, "src/data/cms.json");
  const pagesJsonPath = join(root, "src/data/pages.json");

  console.log(pc.bold("cms-bridge migrate") + (dryRun ? " (dry run)" : ""));

  if (existsSync(cmsJsonPath)) {
    console.log(pc.yellow("  ⚠ src/data/cms.json already exists — nothing to do."));
    return 0;
  }
  if (!existsSync(configPath)) {
    console.error(pc.red("  ✖ No .pages.yml found — nothing to migrate."));
    return 1;
  }

  let config: Record<string, any>;
  try {
    config = YAML.parse(readFileSync(configPath, "utf8")) ?? {};
  } catch (error: any) {
    console.error(pc.red(`  ✖ .pages.yml has parse errors: ${error?.message}`));
    return 1;
  }

  const settings = config.settings ?? {};
  const baseUrl: string | undefined = settings.baseUrl;
  if (!baseUrl) {
    console.error(
      pc.red("  ✖ settings.baseUrl missing — the v2 manifest requires it.")
    );
    return 1;
  }
  const previewPaths: Record<string, string> = settings.preview?.paths ?? {};
  const { files, collections } = flattenContent(config.content);

  // ---- pages.json: merge every non-site JSON file entry under its name.
  const pages: Record<string, unknown> = {};
  const mergedSources: Array<{ entry: string; path: string }> = [];
  for (const entry of files) {
    if (entry.name === "site") continue;
    if (!entry.path.endsWith(".json")) {
      console.log(
        pc.yellow(`  ⚠ Skipping "${entry.name}" (${entry.path}) — not JSON.`)
      );
      continue;
    }
    const full = join(root, entry.path);
    if (!existsSync(full)) {
      console.log(pc.yellow(`  ⚠ Missing content file: ${entry.path}`));
      continue;
    }
    pages[entry.name] = JSON.parse(readFileSync(full, "utf8"));
    mergedSources.push({ entry: entry.name, path: entry.path });
  }

  // ---- cms.json: pages from non-templated preview paths; collections from
  // declared collection entries (route from a templated preview path if any).
  const manifestPages: Record<string, { route: string; title?: string }> = {};
  const collectionNames = new Set(collections.map((entry) => entry.name));
  for (const [name, template] of Object.entries(previewPaths)) {
    if (name === "site" || template.includes("{") || collectionNames.has(name))
      continue;
    if (!(name in pages)) continue;
    const label = files.find((candidate) => candidate.name === name)?.label;
    manifestPages[name] = { route: template, ...(label ? { title: label } : {}) };
  }
  // Pages with content but no preview route get the /<name> default.
  for (const name of Object.keys(pages)) {
    if (!manifestPages[name]) {
      manifestPages[name] = { route: name === "home" ? "/" : `/${name}` };
    }
  }

  const manifestCollections = collections.map((entry) => {
    const route = previewPaths[entry.name];
    return {
      name: entry.name,
      ...(entry.label ? { label: entry.label } : {}),
      path: entry.path,
      ...(route && route.includes("{") ? { route } : {}),
      fields: declarationFields(entry.fields),
    };
  });

  const manifest = {
    version: 1,
    baseUrl,
    media: Array.isArray(config.media)
      ? config.media[0]
        ? { input: config.media[0].input, output: config.media[0].output }
        : undefined
      : config.media
        ? { input: config.media.input, output: config.media.output }
        : undefined,
    pages: manifestPages,
    collections: manifestCollections,
  };

  // ---- Import codemod: `import x from ".../data/<page>.json"` → pages.json.
  const entryByStem = new Map<string, string>();
  for (const { entry, path } of mergedSources) {
    const stem = path.split("/").pop()!.replace(/\.json$/, "");
    entryByStem.set(stem, entry);
  }
  const importRe =
    /import\s+(\w+)\s+from\s+["']([^"']*\/data\/)([\w-]+)\.json["'];?/g;
  const editedFiles: string[] = [];
  for (const file of sourceFiles(root)) {
    const source = readFileSync(file, "utf8");
    let pagesImported = false;
    let touched = false;
    const next = source.replace(
      importRe,
      (match, ident: string, dir: string, stem: string) => {
        const entry = entryByStem.get(stem);
        if (!entry) return match; // site.json / unmanaged file — leave alone
        touched = true;
        const lines: string[] = [];
        if (!pagesImported) {
          pagesImported = true;
          lines.push(`import pages from "${dir}pages.json";`);
        }
        lines.push(`const ${ident} = pages.${entry};`);
        return lines.join("\n");
      }
    );
    if (touched) {
      editedFiles.push(relative(root, file));
      if (!dryRun) writeFileSync(file, next);
    }
  }

  // ---- Write outputs.
  if (!dryRun) {
    writeFileSync(pagesJsonPath, JSON.stringify(pages, null, 2) + "\n");
    writeFileSync(cmsJsonPath, JSON.stringify(manifest, null, 2) + "\n");
  }

  console.log(
    pc.green(
      `  ✓ pages.json — ${mergedSources.length} page(s): ${mergedSources
        .map((source) => source.entry)
        .join(", ")}`
    )
  );
  console.log(
    pc.green(
      `  ✓ cms.json — ${Object.keys(manifestPages).length} page route(s), ${manifestCollections.length} collection(s)`
    )
  );
  if (editedFiles.length) {
    console.log(pc.green(`  ✓ ${editedFiles.length} import(s) rewired:`));
    for (const file of editedFiles) console.log(`      ${file}`);
  }

  // ---- Legacy cleanup (opt-in).
  if (options.deleteLegacy) {
    if (!dryRun) {
      for (const { path } of mergedSources) unlinkSync(join(root, path));
      unlinkSync(configPath);
    }
    console.log(
      pc.green(
        `  ✓ Removed .pages.yml + ${mergedSources.length} legacy page JSON(s)`
      )
    );
  } else {
    console.log(
      pc.dim(
        "  · Legacy .pages.yml + per-page JSONs kept — rerun with --delete-legacy once the v2 canvas round-trips."
      )
    );
  }

  return 0;
}
