// Generates favicons, app icons, and the OG image from a master logo.
// Copy into the project's scripts/ dir, adapt the constants, then:
//   pnpm add -D sharp png-to-ico && node scripts/generate-brand-assets.mjs
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { writeFile } from "node:fs/promises";

// ── Adapt these per project ──────────────────────────────────────────────
const LOGO_URL = "https://example.com/path/to/logo.webp"; // or read a local file
const BRAND_BG = "#000000"; // brand color; dark if logo has light text
// Crop region for the favicon mark — full lockups are unreadable at 16px.
// Eyeball the logo first and crop to the monogram (e.g. top 65%).
const MARK_CROP = (w, h) => ({ left: 0, top: 0, width: w, height: Math.round(h * 0.65) });
// ─────────────────────────────────────────────────────────────────────────

const logo = Buffer.from(await (await fetch(LOGO_URL)).arrayBuffer());
const { width, height } = await sharp(logo).metadata();

// Two passes: sharp runs trim before extract within one pipeline.
const topCrop = await sharp(logo).extract(MARK_CROP(width, height)).png().toBuffer();
const mark = await sharp(topCrop).trim().png().toBuffer();

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const icon = (size, background = TRANSPARENT) =>
  sharp(mark)
    .resize(size, size, { fit: "contain", background })
    .flatten(background === TRANSPARENT ? false : { background })
    .png()
    .toBuffer();

await writeFile(
  "public/favicon.ico",
  await pngToIco([await icon(16), await icon(32), await icon(48)])
);
// Apple convention: opaque background.
await writeFile("public/apple-touch-icon.png", await icon(180, BRAND_BG));
await writeFile("public/icon-192.png", await icon(192));
await writeFile("public/icon-512.png", await icon(512));

// OG image: full logo centered on the brand background, 1200x630.
const ogLogo = await sharp(logo)
  .resize(780, 460, { fit: "contain", background: TRANSPARENT })
  .png()
  .toBuffer();
await sharp({
  create: { width: 1200, height: 630, channels: 4, background: BRAND_BG },
})
  .composite([{ input: ogLogo, gravity: "centre" }])
  .png()
  .toFile("public/og-image.png");

console.log("Generated: favicon.ico, apple-touch-icon.png, icon-192/512.png, og-image.png");
