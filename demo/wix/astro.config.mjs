// SSR on Netlify: every request fetches live FAQ + form schema from Wix, so an
// edit in the Wix dashboard shows on the next reload. No CDN caching on purpose
// (that is the demo moment).
import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "server",
  // Adapter only for builds: in dev, Netlify's emulation boots a Deno edge-functions
  // server (for the middleware a local build leaves in .netlify/v1) that fails
  // without Deno and paints an error overlay. Plain `astro dev` needs no adapter.
  adapter: process.argv.includes("dev") ? undefined : netlify({ devFeatures: false, imageCDN: false }),
  vite: { plugins: [tailwindcss()] },
});
