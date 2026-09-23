import { defineConfig } from "tsup";

export default defineConfig([
  // Astro integration (node, ESM only — astro.config is always ESM-loaded, and
  // the runtime relies on import.meta.url to locate the overlay bundle).
  {
    entry: { astro: "src/astro.ts" },
    format: ["esm"],
    platform: "node",
    target: "node18",
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    minify: false,
    external: ["astro", "@astrojs/compiler"],
  },
  // Browser overlay — an IIFE read via readFileSync by the integration and
  // injected inline on every page. Output: dist/client.global.js.
  {
    entry: { client: "src/client.ts" },
    format: ["iife"],
    target: "es2018",
    dts: false,
    clean: false,
    splitting: false,
    sourcemap: false,
    minify: true,
  },
]);
