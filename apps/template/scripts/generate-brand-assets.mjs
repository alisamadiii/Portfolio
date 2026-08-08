// Generates favicon, app icons, and the OG image from the client's logo.
// Run after editing LOGO below when forking the template for a new client:
//   node scripts/generate-brand-assets.mjs
// Requires sharp + png-to-ico (present at the monorepo root; add as devDeps
// if this app is deployed standalone).
import { mkdir, writeFile } from "node:fs/promises";
import pngToIco from "png-to-ico";
import sharp from "sharp";

// EDIT PER CLIENT: URL or local path to a square logo (>= 512px).
const LOGO = "https://cdn.alisamadii.com/company/business-logo-soft-rounded.png";
// EDIT PER CLIENT: OG canvas background — pair it with the logo's colors.
const OG_BACKGROUND = "#f6f5f3";

const logo = LOGO.startsWith("http")
  ? Buffer.from(await (await fetch(LOGO)).arrayBuffer())
  : LOGO;

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const icon = (size) =>
  sharp(logo, { density: 300 })
    .resize(size, size, { fit: "contain", background: TRANSPARENT })
    .png()
    .toBuffer();

await mkdir("public", { recursive: true });
await writeFile(
  "public/favicon.ico",
  await pngToIco([await icon(16), await icon(32), await icon(48)])
);
await writeFile("public/apple-touch-icon.png", await icon(180));
await writeFile("public/icon-192.png", await icon(192));
await writeFile("public/icon-512.png", await icon(512));

const ogLogo = await sharp(logo, { density: 300 })
  .resize(460, 460, { fit: "contain", background: TRANSPARENT })
  .png()
  .toBuffer();
await sharp({
  create: { width: 1200, height: 630, channels: 4, background: OG_BACKGROUND },
})
  .composite([{ input: ogLogo, gravity: "centre" }])
  .png()
  .toFile("public/og-image.png");

console.log("Generated: favicon.ico, apple-touch-icon.png, icon-192/512.png, og-image.png");
