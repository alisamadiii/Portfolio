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
  "logo-colors-hero": "logo design color swatches branding moodboard",
  "logo-hex": "color swatches palette samples designer hand",
  "color-rule": "paint color palette cards fan deck",
  "website-buttons": "website ui design colorful screen closeup",
  "logo-concepts": "graphic designer sketching logo ideas notebook",
  "domain-hero": "person typing laptop website browser address bar",
  "domain-keys": "handing over house keys hands closeup",
  "dns-setup": "video call screen share laptop help support",
  "ses-hero": "laptop email inbox screen desk workspace",
  "email-pricing": "calculator coins budget desk closeup",
  "email-setup": "network cables server room closeup",
  "email-legit": "person reading phone coffee cafe smiling",
  "email-records": "organized files archive folders shelf",
  "slow-culprits": "server room data center blue lights",
  "platform-tax": "frustrated person laptop office desk",
  "mobile-speed": "person holding smartphone city street",
  "jax-cost-hero": "calculator notebook budget planning desk",
  "cost-snapshot": "price tags wooden table closeup",
  "cost-levers": "sticky notes laptop planning project scope",
  "hidden-costs": "person reviewing invoices receipts desk",
  "published-prices": "laptop screen pricing page clean minimal",
  "walk-away-owning": "handing keys hands ownership closeup",
  "dmg-hero": "marketing strategy planning whiteboard sticky notes",
};

// key → exact Pexels photo id. Overrides the search query for that key.
const PINNED = {
  "domain-hero": 4160089,
};

await mkdir(resolve(appRoot, "public/blog"), { recursive: true });

const credits = {};

for (const [key, query] of Object.entries(QUERIES)) {
  let photo;
  if (PINNED[key]) {
    const res = await fetch(`https://api.pexels.com/v1/photos/${PINNED[key]}`, {
      headers: { Authorization: KEY },
    });
    if (!res.ok) {
      console.error(
        `Pexels photo ${PINNED[key]} failed for ${key}: HTTP ${res.status}`
      );
      process.exit(1);
    }
    photo = await res.json();
  } else {
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
    photo = photos[0];
  }
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
