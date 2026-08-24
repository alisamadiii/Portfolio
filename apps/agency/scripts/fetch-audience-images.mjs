// Fetches one photo per audience segment from the Pexels API, optimizes it to
// webp, and records photographer credits. Feeds the "Who We Build For" section.
//
//   pnpm audiences:images        (from apps/agency)
//
// Reads PEXELS_API_KEY from apps/agency/.env (build/prep only — the key never
// ships to the browser). Writes:
//   public/audiences/<slug>.webp             (1600x1000, q78)
//   src/data/audience-image-credits.json     ({ slug: { name, url, pexelsUrl } })
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

const env = await readFile(resolve(appRoot, ".env"), "utf8").catch(() => "");
const KEY =
  process.env.PEXELS_API_KEY ??
  env.match(/^PEXELS_API_KEY=(.*)$/m)?.[1]?.trim();

if (!KEY) {
  console.error("Missing PEXELS_API_KEY (apps/agency/.env)");
  process.exit(1);
}

// slug → [primary query, fallback query]. One photo per audience segment.
const QUERIES = {
  trades: ["HVAC technician working service van", "plumber contractor at work"],
  founders: [
    "startup founder working laptop",
    "young entrepreneur laptop office",
  ],
  "small-business": [
    "small business owner storefront shop",
    "local shop owner counter",
  ],
};

await mkdir(resolve(appRoot, "public/audiences"), { recursive: true });

const search = async (query) => {
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=5`,
    { headers: { Authorization: KEY } }
  );
  if (!res.ok) {
    console.error(`Pexels search failed ("${query}"): HTTP ${res.status}`);
    process.exit(1);
  }
  const { photos } = await res.json();
  return photos ?? [];
};

const credits = {};

for (const [slug, [primary, fallback]] of Object.entries(QUERIES)) {
  let photos = await search(primary);
  if (!photos.length) {
    console.warn(`No results for "${primary}" — falling back to "${fallback}"`);
    photos = await search(fallback);
  }
  if (!photos.length) {
    console.error(`No Pexels results for ${slug}`);
    process.exit(1);
  }

  const photo = photos[0];
  const img = await fetch(photo.src.large2x ?? photo.src.original);
  const buf = Buffer.from(await img.arrayBuffer());

  const out = resolve(appRoot, `public/audiences/${slug}.webp`);
  // 16:10 to match the card aspect. Step quality down to fit ~220KB budget.
  for (const quality of [78, 68, 58]) {
    await sharp(buf)
      .resize(1600, 1000, { fit: "cover" })
      .webp({ quality })
      .toFile(out);
    if ((await readFile(out)).length <= 220 * 1024) break;
  }

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
  resolve(appRoot, "src/data/audience-image-credits.json"),
  JSON.stringify(credits, null, 2) + "\n"
);

console.log("\nWrote src/data/audience-image-credits.json");
