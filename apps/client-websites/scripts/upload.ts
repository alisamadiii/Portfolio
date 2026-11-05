// Reference uploader: pushes a local site folder to the bucket under <slug>/,
// following the contract in README.md. Also the fallback when the Claude Design
// skill cannot reach R2 itself.
//
//   pnpm --filter client-websites upload <folder> --slug joes-plumbing \
//     [--name "Joe's Plumbing"] [--meta ./meta.json] [--presentation ./deck.html]
//
// Replaces the whole <slug>/ prefix, except that a presentation.html already
// in the bucket is kept when this upload brings none. Needs a read + write R2
// token in .env.
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import { getMimeType } from "hono/utils/mime";

import { metaSchema, PRESENTATION_FILE } from "../server/meta";
import { deleteObject, listKeys, putObject } from "../server/r2";

const META_FILE = "_meta.json";
const SKIP = new Set([".DS_Store", "Thumbs.db", ".git", "node_modules"]);
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

const walk = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => !SKIP.has(entry.name))
      .map((entry) =>
        entry.isDirectory()
          ? walk(join(dir, entry.name))
          : [join(dir, entry.name)]
      )
  );
  return files.flat();
};

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    slug: { type: "string" },
    name: { type: "string" },
    meta: { type: "string" },
    presentation: { type: "string" },
  },
});

const folder = positionals[0];
const slug = values.slug ?? "";
if (!folder) fail("Usage: upload <folder> --slug <slug> [--name <name>] [--meta <file>] [--presentation <file>]");
if (!SLUG.test(slug)) fail("--slug is required: lowercase letters, numbers and hyphens.");

const root = resolve(folder!);
// --presentation wins over a presentation.html already in the folder
const deck = values.presentation
  ? await readFile(values.presentation).catch((err: Error) =>
      fail(`Could not read ${values.presentation}: ${err.message}`)
    )
  : null;
const files = (await walk(root)).filter((file) => {
  const name = relative(root, file);
  return name !== META_FILE && !(deck && name === PRESENTATION_FILE);
});
if (!files.some((file) => relative(root, file) === "index.html")) {
  fail(`${root} has no index.html at its top level.`);
}

// _meta.json: --meta file, else the folder's own, else just the name.
const metaPath = values.meta ?? join(root, META_FILE);
const rawMeta: Record<string, unknown> = await readFile(metaPath, "utf8")
  .then((text) => JSON.parse(text))
  .catch((err: NodeJS.ErrnoException) =>
    values.meta || err.code !== "ENOENT"
      ? fail(`Could not read ${metaPath}: ${err.message}`)
      : {}
  );
const meta = metaSchema.safeParse({
  version: 1,
  ...rawMeta,
  name: values.name ?? rawMeta.name ?? slug,
  uploadedAt: new Date().toISOString(),
});
if (!meta.success) fail(`Invalid meta: ${meta.error.message}`);

const hasDeck =
  deck !== null ||
  files.some((file) => relative(root, file) === PRESENTATION_FILE);
const deckKey = `${slug}/${PRESENTATION_FILE}`;
const stale = (await listKeys(`${slug}/`)).filter(
  (key) => hasDeck || key !== deckKey
);
await Promise.all(stale.map(deleteObject));

for (const file of files) {
  const key = `${slug}/${relative(root, file).split(sep).join("/")}`;
  await putObject(
    key,
    await readFile(file),
    getMimeType(key) ?? "application/octet-stream"
  );
  console.log(`  ${key}`);
}
if (deck) {
  await putObject(deckKey, deck, "text/html; charset=utf-8");
  console.log(`  ${deckKey}`);
}
await putObject(
  `${slug}/${META_FILE}`,
  JSON.stringify(meta.data, null, 2),
  "application/json"
);

console.log(
  `Uploaded ${files.length} files to ${slug}/ (replaced ${stale.length} existing objects).`
);
