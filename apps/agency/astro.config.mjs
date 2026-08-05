import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://agency.alisamadii.com",
  output: "static",
  trailingSlash: "never",
  // Flat dist/prizink.html etc. so Vercel clean URLs serve /prizink exactly
  // like the old static-directory deploy did (no trailing-slash change).
  build: { format: "file" },
  integrations: [
    sitemap({
      // onboarding is noindex — keep it out of the sitemap.
      filter: (page) => !page.includes("/onboarding"),
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
