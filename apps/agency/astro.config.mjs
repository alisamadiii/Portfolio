import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://agency.alisamadii.com",
  // Static by default — every marketing page is still prerendered. The Node
  // adapter only kicks in for routes that opt out via `prerender = false`
  // (currently just the URL-shortener [slug] redirect).
  output: "static",
  adapter: node({ mode: "standalone" }),
  trailingSlash: "never",
  // Flat dist/pricing.html etc. so Vercel clean URLs serve /pricing exactly
  // like the old static-directory deploy did (no trailing-slash change).
  build: { format: "file" },
  // Next.js-Link-style speed: prefetch every internal link on hover.
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  integrations: [
    sitemap({
      // Emit a build-date lastmod so crawlers get a real freshness signal.
      serialize: (item) => ({ ...item, lastmod: new Date().toISOString() }),
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
