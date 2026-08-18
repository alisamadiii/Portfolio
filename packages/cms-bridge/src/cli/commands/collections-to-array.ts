/**
 * cms-bridge collections-to-array — migrate directory-backed JSON collections
 * to the array-file model. For each collection in cms.json whose `path` is a
 * DIRECTORY of `.json` files, this:
 *
 *   1. reads every entry file, ordered by its `sort_order` field (asc),
 *   2. strips `sort_order` (order is now array position),
 *   3. writes the ordered array to `<path>.json`,
 *   4. rewrites the cms.json collection `path` to the `.json` file and drops
 *      the `sort_order` field + `format` from its declaration,
 *   5. deletes the old directory.
 *
 * Routed / Markdown collections (a directory of `.md`/`.mdx`, e.g. a blog) are
 * left untouched — they need per-file slugs and bodies. Idempotent: a
 * collection whose `path` already ends in `.json` is skipped.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";

import pc from "picocolors";

type Options = { dryRun?: boolean };

const readJson = (file: string): any => JSON.parse(readFileSync(file, "utf8"));

export function collectionsToArrayCommand(
  root: string,
  options: Options = {}
): number {
  const manifestPath = join(root, "src/data/cms.json");
  if (!existsSync(manifestPath)) {
    console.error(
      `${pc.red("No src/data/cms.json found.")} Run this from a v2 project root.`
    );
    return 1;
  }

  let manifest: any;
  try {
    manifest = readJson(manifestPath);
  } catch {
    console.error(pc.red("src/data/cms.json is not valid JSON."));
    return 1;
  }

  const collections: any[] = Array.isArray(manifest.collections)
    ? manifest.collections
    : [];
  let converted = 0;

  for (const collection of collections) {
    const relPath: string = collection?.path ?? "";
    if (typeof relPath !== "string" || relPath.endsWith(".json")) continue; // already array

    const dir = join(root, relPath);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;

    const files = readdirSync(dir).filter((name) => name.endsWith(".json"));
    if (files.length === 0) {
      // No JSON files — either empty or a Markdown/routed collection. Skip.
      const hasMarkdown = readdirSync(dir).some((name) =>
        /\.(md|mdx)$/.test(name)
      );
      if (hasMarkdown) {
        console.log(
          `${pc.dim("skip")} ${collection.name} — Markdown collection (stays directory-backed).`
        );
      }
      continue;
    }

    const items = files
      .map((name) => readJson(join(dir, name)))
      .sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0))
      .map((item) => {
        if (item && typeof item === "object") {
          const { sort_order: _drop, ...rest } = item;
          return rest;
        }
        return item;
      });

    // Array files live in a `collections/` subfolder next to the manifest, so
    // src/data/ keeps only the three core files (cms.json, pages.json,
    // site.json). e.g. "src/data/team" → "src/data/collections/team.json".
    const arrayFile = `${dirname(relPath)}/collections/${basename(relPath)}.json`;
    const arrayAbs = join(root, arrayFile);

    console.log(
      `${pc.green("convert")} ${collection.name}: ${files.length} files → ${arrayFile}`
    );

    if (!options.dryRun) {
      mkdirSync(dirname(arrayAbs), { recursive: true });
      writeFileSync(arrayAbs, JSON.stringify(items, null, 2) + "\n");
      rmSync(dir, { recursive: true, force: true });
    }

    // Update the manifest declaration in place.
    collection.path = arrayFile;
    delete collection.format;
    if (Array.isArray(collection.fields)) {
      collection.fields = collection.fields.filter(
        (field: any) => field?.name !== "sort_order"
      );
    }
    converted += 1;
  }

  if (converted === 0) {
    console.log(pc.dim("Nothing to convert — no directory JSON collections."));
    return 0;
  }

  if (!options.dryRun) {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  }

  console.log(
    options.dryRun
      ? pc.yellow(`\nDry run — ${converted} collection(s) would convert.`)
      : pc.green(
          `\n✓ Converted ${converted} collection(s). Update your loaders to import the array files, then run "cms-bridge check".`
        )
  );
  return 0;
}
