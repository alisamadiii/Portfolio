// Generates the 1200x630 OG image for the homepage (/, website offer).
// Left: logo lockup + hero headline. Right: dark card "Keep your platform.
// Skip the template." with Shopify / Wix / Square logo tiles (simple-icons
// paths, same as the homepage platforms section). No photo, no price.
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
const INK = "#221f1c";
const CREAM = "#fffdfb";
const SOFT = "#5a524b";
const ACCENT = "#e0603d";
const CORAL = "#fc8464";
const FONT = "Helvetica Neue, Arial, sans-serif";

const logo = await sharp(resolve(appRoot, "public/images/agency/logo.png")).resize(52, 52).png().toBuffer();

// Brand marks (simple-icons). Wix's mark is its wordmark, cropped to its ink.
const brands = [
  { name: "Shopify", color: "#95BF47", viewBox: "0 0 24 24", path: "M15.337 23.979l7.216-1.561s-2.604-17.613-2.625-17.73c-.018-.116-.114-.192-.211-.192s-1.929-.136-1.929-.136-1.275-1.274-1.439-1.411c-.045-.037-.075-.057-.121-.074l-.914 21.104h.023zM11.71 11.305s-.81-.424-1.774-.424c-1.447 0-1.504.906-1.504 1.141 0 1.232 3.24 1.715 3.24 4.629 0 2.295-1.44 3.76-3.406 3.76-2.354 0-3.54-1.465-3.54-1.465l.646-2.086s1.245 1.066 2.28 1.066c.675 0 .975-.545.975-.932 0-1.619-2.654-1.694-2.654-4.359-.034-2.237 1.571-4.416 4.827-4.416 1.257 0 1.875.361 1.875.361l-.945 2.715-.02.01zM11.17.83c.136 0 .271.038.405.135-.984.465-2.064 1.639-2.508 3.992-.656.213-1.293.405-1.889.578C7.697 3.75 8.951.84 11.17.84V.83zm1.235 2.949v.135c-.754.232-1.583.484-2.394.736.466-1.777 1.333-2.645 2.085-2.971.193.501.309 1.176.309 2.1zm.539-2.234c.694.074 1.141.867 1.429 1.755-.349.114-.735.231-1.158.366v-.252c0-.752-.096-1.371-.271-1.871v.002zm2.992 1.289c-.02 0-.06.021-.078.021s-.289.075-.714.21c-.423-1.233-1.176-2.37-2.508-2.37h-.115C12.135.209 11.669 0 11.265 0 8.159 0 6.675 3.877 6.21 5.846c-1.194.365-2.063.636-2.16.674-.675.213-.694.232-.772.87-.075.462-1.83 14.063-1.83 14.063L15.009 24l.927-21.166z" },
  { name: "Wix", color: "#0C6EFC", viewBox: "0 7 24 10", path: "m0 7.354 2.113 9.292h.801a1.54 1.54 0 0 0 1.506-1.218l1.351-6.34a.171.171 0 0 1 .167-.137c.08 0 .15.058.167.137l1.352 6.34a1.54 1.54 0 0 0 1.506 1.218h.805l2.113-9.292h-.565c-.62 0-1.159.43-1.296 1.035l-1.26 5.545-1.106-5.176a1.76 1.76 0 0 0-2.19-1.324c-.639.176-1.113.716-1.251 1.365l-1.094 5.127-1.26-5.537A1.33 1.33 0 0 0 .563 7.354H0zm13.992 0a.951.951 0 0 0-.951.95v8.342h.635a.952.952 0 0 0 .951-.95V7.353h-.635zm1.778 0 3.158 4.66-3.14 4.632h1.325c.368 0 .712-.181.918-.486l1.756-2.59a.12.12 0 0 1 .197 0l1.754 2.59c.206.305.55.486.918.486h1.326l-3.14-4.632L24 7.354h-1.326c-.368 0-.712.181-.918.486l-1.772 2.617a.12.12 0 0 1-.197 0L18.014 7.84a1.108 1.108 0 0 0-.918-.486H15.77z" },
  { name: "Square", color: "#3E4348", viewBox: "0 0 24 24", path: "M4.01 0A4.01 4.01 0 000 4.01v15.98c0 2.21 1.8 4 4.01 4.01h15.98C22.2 24 24 22.2 24 19.99V4A4.01 4.01 0 0019.99 0H4zm1.62 4.36h12.74c.7 0 1.26.57 1.26 1.27v12.74c0 .7-.56 1.27-1.26 1.27H5.63c-.7 0-1.26-.57-1.26-1.27V5.63a1.27 1.27 0 011.26-1.27zm3.83 4.35a.73.73 0 00-.73.73v5.09c0 .4.32.72.72.72h5.1a.73.73 0 00.73-.72V9.44a.73.73 0 00-.73-.73h-5.1Z" },
];

// Right card geometry.
const CARD_X = 700, CARD_Y = 64, CARD_W = 436, CARD_H = H - 128;
const TILE = 112, GAP = 18;
const tilesW = brands.length * TILE + (brands.length - 1) * GAP;
const tileX0 = CARD_X + (CARD_W - tilesW) / 2;
const tileY = CARD_Y + 236;

const tiles = brands
  .map((b, i) => {
    const x = tileX0 + i * (TILE + GAP);
    const wide = b.name === "Wix";
    const mw = wide ? 78 : 58;
    const mh = wide ? 32.5 : 58;
    return `
    <rect x="${x}" y="${tileY}" width="${TILE}" height="${TILE}" rx="26" fill="#fff"/>
    <svg x="${x + (TILE - mw) / 2}" y="${tileY + (TILE - mh) / 2}" width="${mw}" height="${mh}" viewBox="${b.viewBox}" fill="${b.color}"><path d="${b.path}"/></svg>
    <text x="${x + TILE / 2}" y="${tileY + TILE + 34}" text-anchor="middle" font-family="${FONT}" font-size="19" font-weight="600" fill="#c9bfb5">${b.name}</text>`;
  })
  .join("\n");

const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="g1" cx="10%" cy="115%" r="70%"><stop offset="0" stop-color="${CORAL}" stop-opacity="0.55"/><stop offset="1" stop-color="${CORAL}" stop-opacity="0"/></radialGradient>
    <radialGradient id="g2" cx="60%" cy="120%" r="60%"><stop offset="0" stop-color="#ffb59a" stop-opacity="0.7"/><stop offset="1" stop-color="#ffb59a" stop-opacity="0"/></radialGradient>
    <linearGradient id="card" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a2622"/><stop offset="1" stop-color="#191613"/></linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feGaussianBlur in="SourceAlpha" stdDeviation="22"/><feOffset dy="26" result="b"/><feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="${CREAM}"/>
  <rect width="${W}" height="${H}" fill="url(#g1)"/>
  <rect width="${W}" height="${H}" fill="url(#g2)"/>
  <!-- faint column lines like the site -->
  <g stroke="rgba(34,31,28,0.06)"><line x1="64" y1="0" x2="64" y2="${H}"/><line x1="382" y1="0" x2="382" y2="${H}"/><line x1="${W - 64}" y1="0" x2="${W - 64}" y2="${H}"/></g>

  <!-- left: lockup + headline -->
  <text x="130" y="92" font-family="${FONT}" font-size="30" font-weight="800" letter-spacing="-1" fill="${INK}">alisamadii</text>
  <text x="64" y="232" font-family="${FONT}" font-size="66" font-weight="800" letter-spacing="-2.8" fill="${INK}">A website that</text>
  <text x="64" y="302" font-family="${FONT}" font-size="66" font-weight="800" letter-spacing="-2.8" fill="${INK}">works as hard</text>
  <text x="64" y="372" font-family="${FONT}" font-size="66" font-weight="800" letter-spacing="-2.8" fill="${INK}">as <tspan fill="${ACCENT}">you do.</tspan></text>
  <text x="64" y="428" font-family="${FONT}" font-size="24" fill="${SOFT}">Custom-designed, hand-coded, live in about a day.</text>
  <text x="64" y="462" font-family="${FONT}" font-size="24" fill="${SOFT}">Edit it yourself. Yours to keep.</text>

  <rect x="64" y="${H - 108}" width="248" height="44" rx="22" fill="${INK}"/>
  <text x="188" y="${H - 79}" text-anchor="middle" font-family="${FONT}" font-size="19" font-weight="700" fill="${CREAM}">Free consultation →</text>
  <text x="332" y="${H - 79}" font-family="${FONT}" font-size="19" fill="${SOFT}">alisamadii.com</text>

  <!-- right: platforms card -->
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="36" fill="url(#card)" filter="url(#shadow)"/>
  <rect x="${CARD_X + 36}" y="${CARD_Y + 40}" width="322" height="36" rx="18" fill="rgba(255,255,255,0.08)"/>
  <circle cx="${CARD_X + 56}" cy="${CARD_Y + 58}" r="5" fill="${CORAL}"/>
  <text x="${CARD_X + 70}" y="${CARD_Y + 64}" font-family="${FONT}" font-size="15" font-weight="600" letter-spacing="2" fill="#f6efe9">ALREADY ON A PLATFORM?</text>
  <text x="${CARD_X + 36}" y="${CARD_Y + 134}" font-family="${FONT}" font-size="42" font-weight="800" letter-spacing="-1.6" fill="#f6efe9">Keep your platform.</text>
  <text x="${CARD_X + 36}" y="${CARD_Y + 184}" font-family="${FONT}" font-size="42" font-weight="800" letter-spacing="-1.6" fill="${CORAL}">Skip the template.</text>
  ${tiles}
  <text x="${CARD_X + CARD_W / 2}" y="${CARD_Y + CARD_H - 44}" text-anchor="middle" font-family="${FONT}" font-size="18" fill="#c9bfb5">Custom site on top, your backend underneath.</text>
</svg>`;

await mkdir(resolve(appRoot, "public/og"), { recursive: true });

await sharp(Buffer.from(svg))
  .composite([{ input: logo, left: 64, top: 56 }])
  .flatten({ background: CREAM })
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(resolve(appRoot, "public/og/websites.jpg"));

console.log("og/websites.jpg");
