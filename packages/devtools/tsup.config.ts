import { readFileSync, writeFileSync } from "fs";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    client: "src/client/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  external: ["react", "react-dom"],
  treeshake: true,
  splitting: false,
  sourcemap: true,
  target: "es2020",
  async onSuccess() {
    const files = ["dist/index.js", "dist/index.cjs"];
    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      writeFileSync(file, `"use client";\n${content}`);
    }
  },
});
