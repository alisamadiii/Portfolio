import { describe, expect, it } from "vitest";

import {
  checkFrameworkFiles,
  UNSUPPORTED_MESSAGES,
} from "@workspace/trpc/lib/detect-framework";

// Hub-side mirror of content-pilot's checkFramework (src/preview/framework.ts).
// GitHub imports are checked here before the project row is saved; the rules
// must match the pilot's (uploads are checked there).

const pkg = (deps: Record<string, string>, devDeps: Record<string, string> = {}) =>
  JSON.stringify({ dependencies: deps, devDependencies: devDeps });

const check = (
  files: string[],
  packageJson: string | null = null,
  astroConfig: string | null = null
) => checkFrameworkFiles({ files, packageJson, astroConfig });

describe("checkFrameworkFiles", () => {
  it("accepts a plain HTML site (no package.json + index.html)", () => {
    expect(check(["index.html", "about.html"])).toEqual({
      ok: true,
      framework: "static",
    });
  });

  it("accepts Astro, including React/MDX islands and adapters on static output", () => {
    expect(
      check(
        ["package.json", "astro.config.mjs"],
        pkg({ astro: "5", "@astrojs/react": "4", "@astrojs/mdx": "4" })
      )
    ).toEqual({ ok: true, framework: "astro" });
    expect(
      check(
        ["package.json", "astro.config.mjs"],
        pkg({ astro: "5", "@astrojs/cloudflare": "12" }),
        "import cloudflare from '@astrojs/cloudflare';\nexport default { adapter: cloudflare() };"
      )
    ).toEqual({ ok: true, framework: "astro" });
  });

  it("accepts Vite by config file or dependency", () => {
    expect(check(["package.json", "vite.config.ts"], pkg({}))).toEqual({
      ok: true,
      framework: "vite",
    });
    expect(check(["package.json"], pkg({}, { vite: "6" }))).toEqual({
      ok: true,
      framework: "vite",
    });
  });

  it("rejects Next.js by config file or dependency", () => {
    expect(check(["package.json", "next.config.ts"], pkg({}))).toMatchObject({
      ok: false,
      reason: "next",
    });
    expect(check(["package.json"], pkg({ next: "15", vite: "6" }))).toMatchObject({
      ok: false,
      reason: "next",
    });
  });

  it("rejects Vite-based SSR meta-frameworks", () => {
    for (const dep of ["@tanstack/react-start", "@sveltejs/kit", "@react-router/dev", "nuxt"]) {
      expect(check(["package.json"], pkg({ [dep]: "1", vite: "6" }))).toMatchObject({
        ok: false,
        reason: "ssr",
      });
    }
  });

  it("rejects Astro with server output", () => {
    expect(
      check(
        ["package.json", "astro.config.mjs"],
        pkg({ astro: "5" }),
        "export default defineConfig({ output: 'server' });"
      )
    ).toMatchObject({ ok: false, reason: "astro_server" });
  });

  it("rejects unknown stacks and empty repos", () => {
    expect(check(["package.json"], pkg({ react: "19" }))).toMatchObject({
      ok: false,
      reason: "unknown",
    });
    expect(check([])).toMatchObject({ ok: false, reason: "unknown" });
  });

  it("never ships an em dash in the client-facing copy", () => {
    for (const message of Object.values(UNSUPPORTED_MESSAGES)) {
      expect(message).not.toContain("—");
    }
  });
});
