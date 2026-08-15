/**
 * `cms-bridge collections` — sync declarative collection definitions
 * (cms/collections/*.yml) into .pages.yml.
 *
 * A definition file's body IS the .pages.yml entry body (zero translation);
 * the CLI injects `name` (from the filename) + `type: collection` and fills
 * defaults. Same merge rules as pages: append-only, user edits win. Deleting
 * a definition never deletes the entry (orphans are only reported).
 */

import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";
import YAML from "yaml";

import {
  ensureEntryInGroup,
  ensureGroup,
  ensurePreviewPath,
  findEntry,
  loadPagesYml,
  savePagesYml,
} from "../core/pages-yml.js";
import { scanProject } from "../core/scan.js";
import type { ContentEntry, FieldDef } from "../types.js";

const sampleValue = (field: FieldDef): unknown => {
  if (field.default !== undefined) return field.default;
  switch (field.type) {
    case "string":
    case "text":
    case "rich-text":
      return `Sample ${field.label ?? field.name}`;
    case "number":
      return 0;
    case "boolean":
      return false;
    case "date":
      return new Date().toISOString().slice(0, 10);
    case "image":
    case "file":
      return "";
    case "object":
      return Object.fromEntries(
        (field.fields ?? []).map((child) => [child.name, sampleValue(child)])
      );
    default:
      return "";
  }
};

export async function collectionsCommand(
  root: string,
  flags: { sample?: boolean; dryRun?: boolean }
): Promise<number> {
  const dryRun = !!flags.dryRun;
  const scan = scanProject(root);

  if (scan.collectionDefs.length === 0) {
    console.log(
      `${pc.bold("cms-bridge collections")} — no definitions found in ${pc.dim("cms/collections/")}`
    );
    console.log(
      pc.dim(
        "  Create cms/collections/<name>.yml with { label, fields } — see docs/collections.md in the package."
      )
    );
    return 0;
  }

  const doc = loadPagesYml(scan.pagesYml);
  const ymlParseErrors =
    "errors" in doc ? (doc as { errors: Array<{ message: string }> }).errors : [];
  if (ymlParseErrors.length > 0) {
    console.log(
      `  ${pc.red("✗")} .pages.yml has parse errors — fix them first (run cms-bridge check). Nothing was written.`
    );
    return 1;
  }
  // Lazy group creation: only materialize the `collections` group when an
  // entry actually needs to be added (avoids serializing an empty group).
  let groupItemsCache: ReturnType<typeof ensureGroup> | null = null;
  const groupItems = () =>
    (groupItemsCache ??= ensureGroup(doc, "collections", "Collections"));
  const defNames: string[] = [];
  let created = 0;
  let fieldsAdded = 0;
  let previewAdded = 0;

  for (const defPath of scan.collectionDefs) {
    const name = path
      .basename(defPath)
      .replace(/\.ya?ml$/, "")
      .toLowerCase();
    defNames.push(name);

    let body: Record<string, unknown>;
    try {
      const parsed = YAML.parse(fs.readFileSync(defPath, "utf8"));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        console.log(`  ${pc.red("✗")} ${path.basename(defPath)}: not a mapping — skipped`);
        continue;
      }
      body = parsed;
    } catch (error) {
      console.log(
        `  ${pc.red("✗")} ${path.basename(defPath)}: ${(error as Error).message} — skipped`
      );
      continue;
    }

    const fields = (body.fields ?? []) as FieldDef[];
    if (!Array.isArray(fields) || fields.length === 0) {
      console.log(`  ${pc.red("✗")} ${name}: no fields defined — skipped`);
      continue;
    }

    const primary =
      ((body.view as Record<string, unknown> | undefined)?.primary as string) ??
      (fields.find((field) => field.name === "title")?.name ??
        fields.find((field) => field.type !== "object" && field.type !== "block")
          ?.name);

    const collectionPath = (body.path as string) ?? `src/data/${name}`;
    // `route` is a bridge-only hint (the dynamic per-item route, e.g.
    // /blog/{slug}) — it maps the collection in settings.preview.paths so the
    // canvas collapses its item URLs into one table card. Not a .pages.yml
    // entry key, so keep it out of the entry body.
    const route = typeof body.route === "string" ? body.route : undefined;
    const entryBody = { ...body };
    delete entryBody.route;
    // The definition body IS the entry body — everything passes through;
    // only name/type are injected and defaults filled where absent.
    const entry: ContentEntry = {
      name,
      type: "collection",
      ...entryBody,
      path: collectionPath,
      format: (body.format as string) ?? "json",
      filename:
        (body.filename as string) ??
        `{year}-{month}-{day}-{fields.${primary ?? "title"}}.json`,
      view: {
        ...(primary ? { primary } : {}),
        ...((body.view as Record<string, unknown>) ?? {}),
      },
      fields,
    };

    const result = ensureEntryInGroup(doc, groupItems, entry);
    if (result.created) created++;
    fieldsAdded += result.fieldsAdded;

    // Wire the per-item route so the canvas can fold item URLs into one card.
    if (route && ensurePreviewPath(doc, name, route)) previewAdded++;

    // Content directory + optional sample.
    const absDir = path.join(root, collectionPath);
    if (!fs.existsSync(absDir) && !dryRun) {
      fs.mkdirSync(absDir, { recursive: true });
      fs.writeFileSync(path.join(absDir, ".gitkeep"), "");
    }
    if (flags.sample && !dryRun) {
      const sampleName = `${new Date().toISOString().slice(0, 10)}-sample.json`;
      const samplePath = path.join(absDir, sampleName);
      const hasEntries = fs.existsSync(absDir)
        ? fs.readdirSync(absDir).some((file) => file.endsWith(".json"))
        : false;
      if (!hasEntries) {
        const sample = Object.fromEntries(
          fields
            .filter((field) => field.name)
            .map((field) => [field.name, sampleValue(field)])
        );
        fs.writeFileSync(samplePath, `${JSON.stringify(sample, null, 2)}\n`);
      }
    }
  }

  // Only write on semantic changes — yaml re-serialization otherwise
  // normalizes formatting of untouched nodes.
  const ymlChanged = created + fieldsAdded + previewAdded > 0;
  if (ymlChanged && !dryRun) {
    fs.writeFileSync(scan.pagesYmlPath, savePagesYml(doc));
  }

  // Orphans: collection entries in yml with no definition file.
  const config = doc.toJS() as Record<string, unknown> | null;
  const content = (config?.content ?? []) as Array<Record<string, unknown>>;
  const collectionsGroup = content.find(
    (item) => item?.name === "collections" && item?.type === "group"
  );
  const orphanNames = ((collectionsGroup?.items ?? []) as Array<Record<string, unknown>>)
    .map((item) => item?.name as string)
    .filter((name) => name && !defNames.includes(name) && findEntry(doc, name));

  const prefix = dryRun ? `${pc.bold(pc.yellow("[dry-run]"))} ` : "";
  console.log(
    `${prefix}${pc.bold("cms-bridge collections")} — ${scan.collectionDefs.length} definition(s)`
  );
  console.log(
    `  ${pc.green("✓")} ${created} collection(s) created, ${fieldsAdded} field(s) added, ${previewAdded} route(s) mapped, .pages.yml ${ymlChanged ? "updated" : "unchanged"}`
  );
  for (const orphan of orphanNames) {
    console.log(
      `  ${pc.yellow("⚠")} entry "${orphan}" has no cms/collections definition (kept — delete it from .pages.yml manually if unwanted)`
    );
  }
  return 0;
}
