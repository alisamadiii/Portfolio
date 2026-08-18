/**
 * `cms-bridge collection` — interactively add an array collection to cms.json.
 *
 * Asks only for the essentials: name, label (defaulted from the name), and the
 * fields (name + type + required). The path is always
 * `src/data/collections/<name>.json`. On finish it creates that file with one
 * placeholder item and appends the collection to cms.json (add-only).
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { Readable, Writable } from "node:stream";
import pc from "picocolors";

import {
  placeholderItem,
  readManifest,
  type CollectionField,
} from "../core/manifest.js";
import { writeJsonObject } from "../core/json-store.js";

const FIELD_TYPES = [
  "string",
  "text",
  "image",
  "date",
  "boolean",
  "number",
  "select",
] as const;

/** "team-members" → "Team Members". */
function humanize(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function collectionCommand(
  root: string,
  io?: { input?: Readable; output?: Writable }
): Promise<number> {
  const cmsFile = path.join(root, "src", "data", "cms.json");
  const manifest = readManifest(root);
  if (!manifest) {
    console.log(
      `${pc.red("✗")} No src/data/cms.json — run ${pc.bold("cms-bridge init")} first.`
    );
    return 1;
  }

  const output = io?.output ?? process.stdout;
  const rl = readline.createInterface({
    input: io?.input ?? process.stdin,
    output,
    terminal: false,
  });
  // Pull one line per prompt via the async iterator — unlike sequential
  // `question()` calls, this never drops buffered lines from piped input.
  const iterator = rl[Symbol.asyncIterator]();
  const ask = async (prompt: string): Promise<string> => {
    output.write(prompt);
    const { value, done } = await iterator.next();
    return done ? "" : String(value);
  };

  try {
    const name = (await ask("Collection name (kebab-case): ")).trim();
    if (!name) {
      console.log(`${pc.yellow("⚠")} No name — aborting.`);
      return 1;
    }
    if ((manifest.collections ?? []).some((c) => c.name === name)) {
      console.log(
        `${pc.red("✗")} Collection "${name}" already exists in cms.json — aborting.`
      );
      return 1;
    }

    const labelAnswer = (
      await ask(`Label [${humanize(name)}]: `)
    ).trim();
    const label = labelAnswer || humanize(name);

    const fields: CollectionField[] = [];
    console.log(pc.dim("Add fields (empty name to finish):"));
    for (;;) {
      const fieldName = (await ask("  Field name: ")).trim();
      if (!fieldName) break;

      let type = (await ask(`  Type (${FIELD_TYPES.join("/")}) [string]: `))
        .trim()
        .toLowerCase();
      while (type && !FIELD_TYPES.includes(type as (typeof FIELD_TYPES)[number])) {
        type = (
          await ask(`  ${pc.yellow("!")} Pick one of ${FIELD_TYPES.join("/")} [string]: `)
        )
          .trim()
          .toLowerCase();
      }
      if (!type) type = "string";

      const requiredAnswer = (await ask("  Required? (y/N): "))
        .trim()
        .toLowerCase();
      const required = requiredAnswer === "y" || requiredAnswer === "yes";

      const field: CollectionField = { name: fieldName, type, label: humanize(fieldName) };
      if (required) field.required = true;
      if (type === "select") {
        const optionsAnswer = (
          await ask("  Options (comma-separated): ")
        ).trim();
        field.options = optionsAnswer
          ? optionsAnswer.split(",").map((o) => o.trim()).filter(Boolean)
          : [];
      }
      fields.push(field);
    }

    if (fields.length === 0) {
      console.log(`${pc.yellow("⚠")} No fields — aborting.`);
      return 1;
    }

    const relPath = `src/data/collections/${name}.json`;
    const abs = path.join(root, relPath);
    if (!fs.existsSync(abs)) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, `${JSON.stringify([placeholderItem(fields)], null, 2)}\n`);
    }

    manifest.collections = [
      ...(manifest.collections ?? []),
      { name, label, path: relPath, fields },
    ];
    writeJsonObject(cmsFile, manifest as unknown as Record<string, unknown>);

    console.log(`${pc.green("✓")} Added collection "${name}" (${fields.length} field(s)).`);
    console.log(`  ${pc.green("✓")} ${relPath}`);
    console.log(`  ${pc.green("✓")} cms.json updated`);
    console.log(pc.dim("  Run `cms-bridge check` to validate."));
    return 0;
  } finally {
    rl.close();
  }
}
