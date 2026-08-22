// Generates per-city 1200x630 OG images for /locations/<slug> pages:
// the city photo from public/locations/<slug>.webp with a charcoal scrim
// and the city name overlaid.
//
//   pnpm locations:og        (from apps/agency, after locations:images)
//
// Text is rasterized from SVG by librsvg, which only sees system fonts —
// the woff2 Geist in node_modules can't be loaded, so a system sans stands in
// (fine at OG size). Output is JPEG — photo content compresses ~5x smaller
// than PNG and OG images must be png/jpg.
import sharp from "sharp";
import { mkdir, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cities } from "../src/data/cities.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");

const W = 1200;
const H = 630;
const CREAM = "#f6f5f3";
const ACCENT = "#fc8464";

const overlay = (name) => `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="scrim" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#141311" stop-opacity="0.82"/>
      <stop offset="0.55" stop-color="#141311" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#141311" stop-opacity="0.08"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#scrim)"/>
  <rect x="64" y="${H - 178}" width="44" height="4" fill="${ACCENT}"/>
  <text x="64" y="${H - 106}" font-family="Helvetica Neue, Arial, sans-serif"
    font-size="72" font-weight="650" fill="${CREAM}">${name}, Florida</text>
  <text x="64" y="${H - 56}" font-family="Helvetica Neue, Arial, sans-serif"
    font-size="27" fill="${CREAM}" fill-opacity="0.85">Web Design &amp; Development — Ali Samadi Agency</text>
</svg>`;

await mkdir(resolve(appRoot, "public/og/locations"), { recursive: true });

for (const city of cities) {
  const src = resolve(appRoot, `public/locations/${city.slug}.webp`);
  const exists = await access(src)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    console.warn(`skip ${city.slug} — no ${src} (run locations:images first)`);
    continue;
  }
  const out = resolve(appRoot, `public/og/locations/${city.slug}.jpg`);
  await sharp(src)
    .resize(W, H, { fit: "cover" })
    .composite([{ input: Buffer.from(overlay(city.name)) }])
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(out);
  console.log(`og/locations/${city.slug}.jpg`);
}

console.log("done");
