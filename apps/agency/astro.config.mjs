import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://www.alisamadii.com",
  // Static by default — every marketing page is still prerendered. The Node
  // adapter only kicks in for routes that opt out via `prerender = false`
  // (currently just the URL-shortener [slug] redirect).
  output: "static",
  adapter: node({ mode: "standalone" }),
  trailingSlash: "never",
  // Directory format (about/index.html) — the @astrojs/node standalone server
  // resolves prerendered routes this way. `format: "file"` (flat about.html)
  // made the server miss them and fall through to the SSR [slug] catch-all,
  // 404-ing nested pages and bouncing top-level ones to the homepage.
  // Next.js-Link-style speed: prefetch every internal link on hover.
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  integrations: [
    mdx(),
    sitemap({
      // Emit a build-date lastmod so crawlers get a real freshness signal.
      serialize: (item) => ({ ...item, lastmod: new Date().toISOString() }),
    }),
  ],
  markdown: { shikiConfig: { theme: "github-light" } },
  vite: { plugins: [tailwindcss()] },
});
