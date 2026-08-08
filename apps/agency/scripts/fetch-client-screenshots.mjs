// Takes a hero screenshot of every client site in src/data/projects.ts,
// optimizes it to webp, and writes it where the cards expect it.
//
//   pnpm clients:screenshots        (from apps/agency)
//
// Runs Playwright chromium headless (first run: `pnpm exec playwright install
// chromium`). Not part of `astro build` — re-run whenever a client redesigns
// their hero, commit the webps, and the next deploy picks them up. Writes:
//   public/clients/<slug>.webp      (1120px wide, q78 — matches concept cards)
//
// The client list is imported straight from src/data/projects.ts (via Node's
// type stripping), so adding a client there is the only step needed here.
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

import { CLIENT_PROJECTS } from "../src/data/projects.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const outDir = resolve(appRoot, "public/clients");

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
});

for (const { slug, url } of CLIENT_PROJECTS) {
  process.stdout.write(`${slug} ← ${url} ... `);
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
  } catch {
    // networkidle can time out on sites with long-polling — fall back to load.
    await page.goto(url, { waitUntil: "load", timeout: 45_000 });
  }
  // Let fonts, hero images, and entrance animations settle.
  await page.waitForTimeout(2500);
  const png = await page.screenshot({ type: "png" });
  await sharp(png)
    .resize({ width: 1120 })
    .webp({ quality: 78 })
    .toFile(resolve(outDir, `${slug}.webp`));
  console.log("ok");
}

await browser.close();
console.log(`Done — ${CLIENT_PROJECTS.length} screenshots in public/clients/`);
