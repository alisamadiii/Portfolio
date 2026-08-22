import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
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
      "@": path.resolve(__dirname, "."),
    },
  },
});
