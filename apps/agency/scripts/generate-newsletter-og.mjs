// Generates the 1200x630 OG image for the /newsletter product page:
// the emails-dashboard screenshot angled on a cream background with the
// page title overlaid. Run once and commit the output:
//
//   node scripts/generate-newsletter-og.mjs    (from apps/agency)
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

// Screenshot fills the right side, cropped by the canvas edge.
const SHOT_W = 640;
const SHOT_H = Math.round((SHOT_W / 1950) * 1205);

const shot = await sharp(
  resolve(appRoot, "public/newsletter-app/02-emails.webp")
)
  .resize(SHOT_W, SHOT_H)
  .png()
  .toBuffer();

const text = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${CREAM}"/>
  <rect x="64" y="150" width="44" height="4" fill="${ACCENT}"/>
  <text x="64" y="196" font-family="Helvetica Neue, Arial, sans-serif"
    font-size="21" letter-spacing="3" fill="${WARMGRAY}">BUSINESS NEWSLETTER</text>
  <text x="64" y="280" font-family="Helvetica Neue, Arial, sans-serif"
    font-size="60" font-weight="650" fill="${CHARCOAL}">A newsletter for</text>
  <text x="64" y="352" font-family="Helvetica Neue, Arial, sans-serif"
    font-size="60" font-weight="650" fill="${CHARCOAL}">your local business,</text>
  <text x="64" y="424" font-family="Helvetica Neue, Arial, sans-serif"
    font-size="60" font-weight="650" fill="${ACCENT}">managed for you</text>
  <text x="64" y="${H - 64}" font-family="Helvetica Neue, Arial, sans-serif"
    font-size="26" fill="${WARMGRAY}">Ali Samadi Agency — agency.alisamadii.com</text>
</svg>`;

await mkdir(resolve(appRoot, "public/og"), { recursive: true });

// Rounded corners + border for the screenshot card.
const rounded = await sharp(shot)
  .composite([
    {
      input: Buffer.from(
        `<svg width="${SHOT_W}" height="${SHOT_H}"><rect width="${SHOT_W}" height="${SHOT_H}" rx="16" fill="#fff"/></svg>`
      ),
      blend: "dest-in",
    },
    {
      input: Buffer.from(
        `<svg width="${SHOT_W}" height="${SHOT_H}"><rect x="1" y="1" width="${SHOT_W - 2}" height="${SHOT_H - 2}" rx="16" fill="none" stroke="${CHARCOAL}" stroke-opacity="0.14" stroke-width="2"/></svg>`
      ),
    },
  ])
  .png()
  .toBuffer();

// The card bleeds off the bottom-right corner; sharp requires overlays to fit
// inside the canvas, so crop the off-canvas part before compositing.
const LEFT = W - SHOT_W + 90;
const TOP = H - SHOT_H + 60;
const visible = await sharp(rounded)
  .extract({ left: 0, top: 0, width: W - LEFT, height: H - TOP })
  .png()
  .toBuffer();

await sharp(Buffer.from(text))
  .composite([{ input: visible, left: LEFT, top: TOP }])
  .flatten({ background: CREAM })
  .jpeg({ quality: 85, mozjpeg: true })
  .toFile(resolve(appRoot, "public/og/newsletter.jpg"));

console.log("og/newsletter.jpg");
