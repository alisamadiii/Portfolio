// Fetches one hero image per Florida city from the Pexels API, optimizes it
// to webp, and records photographer credits.
//
//   pnpm locations:images        (from apps/agency)
//
// Reads PEXELS_API_KEY from apps/agency/.env (build/prep only — the key never
// ships to the browser). Writes:
//   public/locations/<slug>.webp             (1600x900, q78)
//   src/data/location-image-credits.json     ({ slug: { name, url, pexelsUrl } })
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

// slug → [primary query, fallback query]. Smaller cities rarely have their own
// Pexels coverage, so fallbacks lean on a representative Florida scene.
const QUERIES = {
  jacksonville: ["Jacksonville Florida skyline bridge", "Jacksonville Florida"],
  miami: ["Miami skyline Biscayne Bay", "Miami Florida skyline"],
  tampa: ["Tampa Florida skyline river", "Tampa Florida"],
  orlando: ["Orlando Florida skyline lake", "Orlando Florida"],
  "st-petersburg": [
    "St Petersburg Florida pier waterfront",
    "St Petersburg Florida",
  ],
  "fort-lauderdale": [
    "Fort Lauderdale Florida canal boats",
    "Fort Lauderdale Florida",
  ],
  hialeah: ["Hialeah Florida", "South Florida palm trees street"],
  tallahassee: ["Tallahassee Florida capitol", "Tallahassee Florida"],
  "cape-coral": ["Cape Coral Florida canal", "Florida canal waterfront homes"],
  "port-st-lucie": ["Port St Lucie Florida", "Florida river palm trees sunset"],
  "pembroke-pines": [
    "Pembroke Pines Florida",
    "Florida lake suburb palm trees",
  ],
  hollywood: ["Hollywood Beach Florida boardwalk", "Hollywood Florida beach"],
  gainesville: [
    "Gainesville Florida university",
    "Florida live oak spanish moss",
  ],
  "west-palm-beach": [
    "West Palm Beach Florida skyline",
    "West Palm Beach Florida",
  ],
  sarasota: ["Sarasota Florida bayfront marina", "Sarasota Florida"],
};

await mkdir(resolve(appRoot, "public/locations"), { recursive: true });

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

  const out = resolve(appRoot, `public/locations/${slug}.webp`);
  // Step quality down until the file fits the ~220KB page-weight budget.
  for (const quality of [78, 68, 58]) {
    await sharp(buf)
      .resize(1600, 900, { fit: "cover" })
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
  resolve(appRoot, "src/data/location-image-credits.json"),
  JSON.stringify(credits, null, 2) + "\n"
);

console.log("\nWrote src/data/location-image-credits.json");
