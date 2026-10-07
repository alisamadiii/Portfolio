// Generates the 1200x630 OG image for the /pest-control industry page:
// dark exterminator theme with a bold uppercase headline and a roach
// silhouette in the corner. Run once and commit the output:
//
//   node scripts/generate-pest-control-og.mjs    (from apps/agency)
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
const VOID = "#0a0f0c";
const DEEP = "#121b15";
const BONE = "#ece9e2";
const FOG = "#93a098";
const ACCENT = "#fc8464";

// Simple roach silhouette, oversized and clipped by the bottom-right corner.
const roach = `
<g transform="translate(940, 360) rotate(-18) scale(5.5)" fill="${DEEP}">
  <g stroke="${DEEP}" stroke-width="2.2" stroke-linecap="round" fill="none">
    <path d="M14 16 8 10M34 16l6-6"/>
    <path d="M12 22H5M12 28l-6 3M36 22h7M36 28l6 3M14 35l-4 6M34 35l4 6"/>
  </g>
  <ellipse cx="24" cy="26" rx="10" ry="15"/>
  <path d="M24 11c4 0 7 2.5 7 6H17c0-3.5 3-6 7-6Z"/>
</g>`;

const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${VOID}"/>
  ${roach}
  <rect x="64" y="130" width="44" height="4" fill="${ACCENT}"/>
  <text x="64" y="178" font-family="Helvetica Neue, Arial, sans-serif"
    font-size="21" letter-spacing="3" fill="${FOG}">WEBSITES FOR PEST CONTROL COMPANIES</text>
  <text x="64" y="282" font-family="Arial Narrow, Helvetica Neue, Arial, sans-serif"
    font-size="86" font-weight="800" letter-spacing="1" fill="${BONE}">PEST CONTROL WEBSITES</text>
  <text x="64" y="378" font-family="Arial Narrow, Helvetica Neue, Arial, sans-serif"
    font-size="86" font-weight="800" letter-spacing="1" fill="${ACCENT}">THAT MAKE THE PHONE RING</text>
  <text x="64" y="452" font-family="Helvetica Neue, Arial, sans-serif"
    font-size="26" fill="${FOG}">Click-to-call. City pages that rank. Reviews. Booking.</text>
  <text x="64" y="${H - 64}" font-family="Helvetica Neue, Arial, sans-serif"
    font-size="26" fill="${FOG}">Ali Samadi Agency — www.alisamadii.com/pest-control</text>
</svg>`;

await mkdir(resolve(appRoot, "public/og"), { recursive: true });

await sharp(Buffer.from(svg))
  .flatten({ background: VOID })
  .jpeg({ quality: 85, mozjpeg: true })
  .toFile(resolve(appRoot, "public/og/pest-control.jpg"));

console.log("og/pest-control.jpg");
