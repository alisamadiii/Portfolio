// SSR on Netlify: every request fetches live FAQ + form schema from Wix, so an
// edit in the Wix dashboard shows on the next reload. No CDN caching on purpose
// (that is the demo moment).
import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "server",
  // devFeatures off: the image CDN emulation spawns a Deno edge-dev server that
  // fails locally and paints an error overlay. No images are optimised here anyway.
  adapter: netlify({ devFeatures: false, imageCDN: false }),
  vite: { plugins: [tailwindcss()] },
});
