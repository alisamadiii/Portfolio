import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://agency.alisamadii.com",
  output: "static",
  trailingSlash: "never",
  // Flat dist/prizink.html etc. so Vercel clean URLs serve /prizink exactly
  // like the old static-directory deploy did (no trailing-slash change).
  build: { format: "file" },
  vite: { plugins: [tailwindcss()] },
});
