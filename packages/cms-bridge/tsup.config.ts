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
