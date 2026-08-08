// Generates favicons, app icons, and OG images for every app from its brand logo.
//   node scripts/generate-brand-assets.mjs [app ...]
// No args = all apps. Icons resize the logo directly; the OG canvas samples the
// logo's corner pixel so full-bleed marks blend seamlessly into the background.
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const CDN = "https://cdn.alisamadii.com/company";

const APPS = {
  portfolio: {
    logo: `${CDN}/business-logo.png`,
    out: "apps/portfolio/public",
    favicon: false, // app/favicon.ico already exists and is correct
  },
  motion: {
    logo: `${CDN}/business-logo-blue.png`,
    out: "apps/motion/public",
    favicon: false,
  },
  docs: {
    logo: `${CDN}/business-logo-black.png`,
    out: "apps/docs/public",
    favicon: true, // docs has no favicon at all
  },
  template: {
    logo: `${CDN}/business-logo-soft-rounded.png`,
    out: "apps/template/public",
    favicon: true, // placeholder set — client forks regenerate from their logo
    ogBackground: "#f6f5f3", // soft-rounded mark has transparent corners
  },
  saaskit: {
    logo: "apps/saaskit/public/favicon.svg",
    out: "apps/saaskit/public",
    favicon: false,
    ogBackground: "#ffffff", // bolt mark is transparent SVG — corners can't be sampled
    ogLogoSize: 320,
  },
};

const targets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : Object.keys(APPS);

for (const name of targets) {
  const app = APPS[name];
  if (!app) {
    console.error(`Unknown app "${name}". Known: ${Object.keys(APPS).join(", ")}`);
    process.exit(1);
  }

  const logo = app.logo.startsWith("http")
    ? Buffer.from(await (await fetch(app.logo)).arrayBuffer())
    : resolve(app.logo);
  const out = (file) => resolve(app.out, file);
  await mkdir(resolve(app.out), { recursive: true });

  const icon = (size) =>
    sharp(logo, { density: 300 })
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

  if (app.favicon) {
    await writeFile(out("favicon.ico"), await pngToIco([await icon(16), await icon(32), await icon(48)]));
  }
  await writeFile(out("apple-touch-icon.png"), await icon(180));
  await writeFile(out("icon-192.png"), await icon(192));
  await writeFile(out("icon-512.png"), await icon(512));

  // OG canvas: sample the logo's top-left pixel so full-bleed square marks
  // extend seamlessly; transparent logos declare an explicit ogBackground.
  let background = app.ogBackground;
  if (!background) {
    const { data } = await sharp(logo).raw().toBuffer({ resolveWithObject: true });
    background = { r: data[0], g: data[1], b: data[2] };
  }
  const ogLogo = await sharp(logo, { density: 300 })
    .resize(app.ogLogoSize ?? 460, app.ogLogoSize ?? 460, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  await sharp({ create: { width: 1200, height: 630, channels: 4, background } })
    .composite([{ input: ogLogo, gravity: "centre" }])
    .png()
    .toFile(out("og-image.png"));

  console.log(`${name}: ${app.favicon ? "favicon.ico, " : ""}apple-touch-icon.png, icon-192/512.png, og-image.png -> ${app.out}`);
}
