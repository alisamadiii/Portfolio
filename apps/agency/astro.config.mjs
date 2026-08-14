import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://agency.alisamadii.com",
  output: "static",
  trailingSlash: "never",
  // Flat dist/pricing.html etc. so Vercel clean URLs serve /pricing exactly
  // like the old static-directory deploy did (no trailing-slash change).
  build: { format: "file" },
  // Next.js-Link-style speed: prefetch every internal link on hover.
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  integrations: [
    sitemap({
      // onboarding + leave-a-review are noindex — keep them out of the sitemap.
      filter: (page) =>
        !page.includes("/onboarding") && !page.includes("/leave-a-review"),
      // Emit a build-date lastmod so crawlers get a real freshness signal.
      serialize: (item) => ({ ...item, lastmod: new Date().toISOString() }),
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
