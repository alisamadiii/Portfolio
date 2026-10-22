// Generates the 1200x630 OG image for the /websites offer page: the
// small-business photo on the right of a cream canvas, title and price on the
// left. Run once and commit the output:
//
//   node scripts/generate-websites-og.mjs    (from apps/agency)
//
// Same librsvg caveat as generate-location-og.mjs: system fonts only.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");

const W = 1200;
const H = 630;
const CHARCOAL = "#1b1a17";
const CREAM = "#f6f5f3";
const WARMGRAY = "#67625a";
const ACCENT = "#fc8464";

// Photo card: right side, inset with rounded corners.
const PHOTO_W = 470;
const PHOTO_H = H - 120;

const photo = await sharp(resolve(appRoot, "public/audiences/small-business.webp"))
  .resize(PHOTO_W, PHOTO_H, { fit: "cover", position: "centre" })
  .composite([
    {
      input: Buffer.from(
        `<svg width="${PHOTO_W}" height="${PHOTO_H}"><rect width="${PHOTO_W}" height="${PHOTO_H}" rx="20" fill="#fff"/></svg>`
      ),
      blend: "dest-in",
    },
  ])
  .png()
  .toBuffer();

const text = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${CREAM}"/>
  <rect x="64" y="130" width="44" height="4" fill="${ACCENT}"/>
  <text x="64" y="176" font-family="Helvetica Neue, Arial, sans-serif"
    font-size="21" letter-spacing="3" fill="${WARMGRAY}">WEBSITES</text>
  <text x="64" y="260" font-family="Helvetica Neue, Arial, sans-serif"
    font-size="58" font-weight="650" fill="${CHARCOAL}">A website for</text>
  <text x="64" y="330" font-family="Helvetica Neue, Arial, sans-serif"
    font-size="58" font-weight="650" fill="${CHARCOAL}">your local</text>
  <text x="64" y="400" font-family="Helvetica Neue, Arial, sans-serif"
    font-size="58" font-weight="650" fill="${ACCENT}">business</text>
  <text x="64" y="462" font-family="Helvetica Neue, Arial, sans-serif"
    font-size="28" fill="${CHARCOAL}">$1,299 setup + $100/mo</text>
  <text x="64" y="${H - 64}" font-family="Helvetica Neue, Arial, sans-serif"
    font-size="24" fill="${WARMGRAY}">Ali Samadi Agency · alisamadii.com</text>
</svg>`;

await mkdir(resolve(appRoot, "public/og"), { recursive: true });

await sharp(Buffer.from(text))
  .composite([{ input: photo, left: W - PHOTO_W - 60, top: 60 }])
  .flatten({ background: CREAM })
  .jpeg({ quality: 85, mozjpeg: true })
  .toFile(resolve(appRoot, "public/og/websites.jpg"));

console.log("og/websites.jpg");
