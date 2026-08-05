// Generates favicons, app icons, and the OG image from the brand logo.
//   node scripts/generate-brand-assets.mjs
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { writeFile } from "node:fs/promises";

// The soft-rounded logo is already a self-contained mark (charcoal "A" on an
// accent rounded square with transparent corners) — no crop needed.
const LOGO_URL =
  "https://cdn.alisamadii.com/company/business-logo-soft-rounded.png";
const ACCENT = "#fc8464"; // matches the logo's own background
const CREAM = "#f6f5f3"; // site background — OG canvas

const logo = Buffer.from(await (await fetch(LOGO_URL)).arrayBuffer());

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const icon = (size, background = TRANSPARENT) =>
  sharp(logo)
    .resize(size, size, { fit: "contain", background })
    .flatten(background === TRANSPARENT ? false : { background })
    .png()
    .toBuffer();

await writeFile(
  "public/favicon.ico",
  await pngToIco([await icon(16), await icon(32), await icon(48)])
);
// Apple convention: opaque background. Flattening on the accent color makes
// the rounded corners blend into a clean full-bleed tile.
await writeFile("public/apple-touch-icon.png", await icon(180, ACCENT));
await writeFile("public/icon-192.png", await icon(192));
await writeFile("public/icon-512.png", await icon(512));

// OG image: logo centered on the site's cream background, 1200x630.
const ogLogo = await sharp(logo)
  .resize(460, 460, { fit: "contain", background: TRANSPARENT })
  .png()
  .toBuffer();
await sharp({
  create: { width: 1200, height: 630, channels: 4, background: CREAM },
})
  .composite([{ input: ogLogo, gravity: "centre" }])
  .png()
  .toFile("public/og-image.png");

console.log(
  "Generated: favicon.ico, apple-touch-icon.png, icon-192/512.png, og-image.png"
);
