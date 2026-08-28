// Fetches one hero image per service from the Pexels API, optimizes it to
// webp, and records photographer credits.
//
//   pnpm services:images        (from apps/agency)
//
// Reads PEXELS_API_KEY from apps/agency/.env (build/prep only — the key never
// ships to the browser). Writes:
//   public/services/<slug>.webp             (1600px wide, q78)
//   src/data/service-image-credits.json     ({ slug: { name, url, pexelsUrl } })
//
// Pexels license allows free use; credit is not required but we always show
// "Photo by <name> on Pexels" on the page. Images are self-hosted — never
// hotlink Pexels URLs.
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");

// Minimal .env reader — no dotenv dependency needed for one key.
const env = await readFile(resolve(appRoot, ".env"), "utf8").catch(() => "");
const KEY =
  process.env.PEXELS_API_KEY ??
  env.match(/^PEXELS_API_KEY=(.*)$/m)?.[1]?.trim();

if (!KEY) {
  console.error("Missing PEXELS_API_KEY (apps/agency/.env)");
  process.exit(1);
}

// slug → search query, tuned for landscape photos that fit each service page.
const QUERIES = {
  "brand-identity": "brand design moodboard color palette",
  "web-development": "web developer coding laptop screen",
  "ui-ux-design": "ux design wireframe sketch interface",
  "seo-analytics": "analytics dashboard charts data",
  "website-management": "person editing website laptop office",
  ecommerce: "online business selling clothes laptop",
  "custom-web-apps": "software engineering team whiteboard",
};

await mkdir(resolve(appRoot, "public/services"), { recursive: true });

const credits = {};

for (const [slug, query] of Object.entries(QUERIES)) {
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=5`,
    { headers: { Authorization: KEY } }
  );
  if (!res.ok) {
    console.error(`Pexels search failed for ${slug}: HTTP ${res.status}`);
    process.exit(1);
  }
  const { photos } = await res.json();
  if (!photos?.length) {
    console.error(`No Pexels results for ${slug} ("${query}")`);
    process.exit(1);
  }

  const photo = photos[0];
  const img = await fetch(photo.src.large2x ?? photo.src.original);
  const buf = Buffer.from(await img.arrayBuffer());

  const out = resolve(appRoot, `public/services/${slug}.webp`);
  await sharp(buf)
    .resize(1600, 1000, { fit: "cover" })
    .webp({ quality: 78 })
    .toFile(out);

  credits[slug] = {
    name: photo.photographer,
    url: photo.photographer_url,
    pexelsUrl: photo.url,
  };
  const size = (await readFile(out)).length;
  console.log(
    `${slug}.webp — ${(size / 1024).toFixed(0)}KB — Photo by ${photo.photographer}`
  );
}

await writeFile(
  resolve(appRoot, "src/data/service-image-credits.json"),
  JSON.stringify(credits, null, 2) + "\n"
);

console.log("\nWrote src/data/service-image-credits.json");
