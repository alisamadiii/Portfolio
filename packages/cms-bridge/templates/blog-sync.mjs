// Mirror published hub blog posts into src/content/blog/. Dumb by design:
// the content API returns final markdown file contents; this script only
// writes changed files and deletes stale ones. Scaffolded by
// `cms-bridge blog`, which stamps this project's hub repo id into the URL.
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const API = "https://api.alisamadii.com/v1/content/blog?repoId=__REPO_ID__";

const res = await fetch(API);
if (!res.ok) {
  console.error(`Content API responded ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const { dir, files } = await res.json();

mkdirSync(dir, { recursive: true });

const wanted = new Set(files.map((file) => file.path));
for (const file of files) {
  const target = join(dir, file.path);
  let current;
  try {
    current = readFileSync(target, "utf8");
  } catch {
    // New file.
  }
  if (current !== file.content) {
    writeFileSync(target, file.content);
    console.log(`write  ${file.path}`);
  }
}

for (const name of readdirSync(dir)) {
  if (name.endsWith(".md") && !wanted.has(name)) {
    rmSync(join(dir, name));
    console.log(`delete ${name}`);
  }
}

console.log(`Synced ${files.length} post(s).`);
