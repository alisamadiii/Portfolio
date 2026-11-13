import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // tsconfig keeps jsx: "preserve" for Next; tests that import .tsx (e.g. the
  // brand logos in lib/apps.ts) need it compiled.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    // Mirror the tsconfig paths hub relies on (cms-core has no exports map).
    alias: {
      "@workspace/cms-core": path.resolve(
        __dirname,
        "../../packages/cms-core/src"
      ),
      "@workspace/trpc": path.resolve(__dirname, "../../packages/trpc/src"),
      "@": path.resolve(__dirname, "."),
    },
  },
});
