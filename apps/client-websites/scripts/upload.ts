// Reference uploader: pushes a local site folder to the bucket under <slug>/,
// following the contract in README.md. Also the fallback when the Claude Design
// skill cannot reach R2 itself.
//
//   pnpm --filter client-websites upload <folder> --slug joes-plumbing \
//     [--name "Joe's Plumbing"] [--meta ./meta.json] [--presentation ./deck.html] \
//     [--video ./preview.mp4] [--poster ./preview.jpg]
//
// Replaces the whole <slug>/ prefix, except that a presentation.html,
// preview.mp4 or preview.jpg already in the bucket is kept when this upload
// brings none. Needs a read + write R2 token in .env.
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import { getMimeType } from "hono/utils/mime";

import {
  metaSchema,
  PRESENTATION_FILE,
  PREVIEW_POSTER_FILE,
  PREVIEW_VIDEO_FILE,
} from "../server/meta";
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
    video: { type: "string" },
    poster: { type: "string" },
  },
});

const folder = positionals[0];
const slug = values.slug ?? "";
if (!folder) fail("Usage: upload <folder> --slug <slug> [--name <name>] [--meta <file>] [--presentation <file>] [--video <file>] [--poster <file>]");
if (!SLUG.test(slug)) fail("--slug is required: lowercase letters, numbers and hyphens.");

const root = resolve(folder!);
const readFlag = (path: string | undefined) =>
  path
    ? readFile(path).catch((err: Error) =>
        fail(`Could not read ${path}: ${err.message}`)
      )
    : null;
// Files that can come from a flag instead of the folder. A flag wins over the
// folder's own copy; with neither, the copy already in the bucket is kept.
const extras = [
  { file: PRESENTATION_FILE, body: await readFlag(values.presentation), type: "text/html; charset=utf-8" },
  { file: PREVIEW_VIDEO_FILE, body: await readFlag(values.video), type: "video/mp4" },
  { file: PREVIEW_POSTER_FILE, body: await readFlag(values.poster), type: "image/jpeg" },
];
const files = (await walk(root)).filter((file) => {
  const name = relative(root, file);
  return (
    name !== META_FILE &&
    !extras.some((extra) => extra.body && name === extra.file)
  );
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

const kept = new Set(
  extras
    .filter(
      (extra) =>
        !extra.body && !files.some((file) => relative(root, file) === extra.file)
    )
    .map((extra) => `${slug}/${extra.file}`)
);
const stale = (await listKeys(`${slug}/`)).filter((key) => !kept.has(key));
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
for (const extra of extras) {
  if (!extra.body) continue;
  await putObject(`${slug}/${extra.file}`, extra.body, extra.type);
  console.log(`  ${slug}/${extra.file}`);
}
await putObject(
  `${slug}/${META_FILE}`,
  JSON.stringify(meta.data, null, 2),
  "application/json"
);

console.log(
  `Uploaded ${files.length} files to ${slug}/ (replaced ${stale.length} existing objects).`
);
