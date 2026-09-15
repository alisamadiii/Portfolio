import { defineConfig } from "tsup";

export default defineConfig([
  // Browser/Astro runtime bridge — published exports, zero runtime deps.
  {
    entry: {
      index: "src/index.ts",
      client: "src/client.ts",
      astro: "src/astro.ts",
      rich: "src/rich.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    treeshake: true,
    splitting: false,
    sourcemap: true,
    minify: true,
    target: "es2018",
    // astro.ts dynamically imports the node-only ./auto subpath — leave the
    // self-import unresolved instead of bundling it into the browser group.
    external: [/^@alisamadiillc\/cms-bridge/],
  },
  // Node-only auto-mode transform — the `./auto` export, lazily imported by
  // the integration when `auto: true`.
  {
    entry: { auto: "src/auto/index.ts" },
    format: ["esm"],
    platform: "node",
    target: "node22",
    dts: true,
    clean: false,
    splitting: false,
    sourcemap: true,
    minify: false,
    external: ["@astrojs/compiler", "es-module-lexer"],
  },
  // Node CLI — bin only, not part of the exports map.
  {
    entry: {
      "cli/index": "src/cli/index.ts",
    },
    format: ["esm"],
    platform: "node",
    target: "node22",
    dts: false,
    clean: false,
    splitting: false,
    sourcemap: false,
    minify: false,
    banner: { js: "#!/usr/bin/env node" },
    external: [
      "@astrojs/compiler",
      "es-module-lexer",
      "magicast",
      "mri",
      "picocolors",
    ],
  },
]);
