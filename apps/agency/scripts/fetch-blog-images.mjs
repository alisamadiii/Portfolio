// Fetches blog post images from the Pexels API, optimizes to webp, and records
// photographer credits.
//
//   pnpm blog:images        (from apps/agency)
//
// Same approach as fetch-service-images.mjs: PEXELS_API_KEY from .env (build/prep
// only), self-hosted images, credits shown on-page. Writes:
//   public/blog/<key>.webp                (1600px wide, q78)
//   src/data/blog-image-credits.json      ({ key: { name, url, pexelsUrl } })
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");

const env = await readFile(resolve(appRoot, ".env"), "utf8").catch(() => "");
const KEY =
  process.env.PEXELS_API_KEY ??
  env.match(/^PEXELS_API_KEY=(.*)$/m)?.[1]?.trim();

if (!KEY) {
  console.error("Missing PEXELS_API_KEY (apps/agency/.env)");
  process.exit(1);
}

// key → search query. Keys match the image references in the blog post.
const QUERIES = {
  "process-hero": "web designer workspace desk laptop",
  discovery: "planning notes sticky notes strategy meeting",
  strategy: "wireframe sketch ux design planning paper",
  execution: "programmer code editor screen closeup",
  launch: "person using laptop website happy office",
  timeline: "calendar clock deadline planning desk",
};

await mkdir(resolve(appRoot, "public/blog"), { recursive: true });

const credits = {};

for (const [key, query] of Object.entries(QUERIES)) {
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=5`,
    { headers: { Authorization: KEY } }
  );
  if (!res.ok) {
    console.error(`Pexels search failed for ${key}: HTTP ${res.status}`);
    process.exit(1);
  }
  const { photos } = await res.json();
  if (!photos?.length) {
    console.error(`No Pexels results for ${key} ("${query}")`);
    process.exit(1);
  }

  const photo = photos[0];
  const img = await fetch(photo.src.large2x ?? photo.src.original);
  const buf = Buffer.from(await img.arrayBuffer());

  const out = resolve(appRoot, `public/blog/${key}.webp`);
  await sharp(buf)
    .resize(1600, 1000, { fit: "cover" })
    .webp({ quality: 78 })
    .toFile(out);

  credits[key] = {
    name: photo.photographer,
    url: photo.photographer_url,
    pexelsUrl: photo.url,
  };
  const size = (await readFile(out)).length;
  console.log(
    `${key}.webp — ${(size / 1024).toFixed(0)}KB — Photo by ${photo.photographer}`
  );
}

await writeFile(
  resolve(appRoot, "src/data/blog-image-credits.json"),
  JSON.stringify(credits, null, 2) + "\n"
);

console.log("\nWrote src/data/blog-image-credits.json");
