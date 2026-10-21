import type { createOctokitInstance } from "./cms/octokit";

/**
 * Hub-side mirror of content-pilot's import gate (src/preview/framework.ts
 * checkFramework). Content Pilot hosts static sites only: Astro (static
 * output), Vite, or plain HTML. A GitHub repo is checked here BEFORE its
 * project row is saved; uploads are checked by the pilot itself on extract.
 * Keep the rules and copy in lockstep with the pilot.
 */

export type SiteFramework = "astro" | "vite" | "static";
export type UnsupportedReason = "next" | "ssr" | "astro_server" | "unknown";

export type FrameworkCheck =
  | { ok: true; framework: SiteFramework }
  | { ok: false; reason: UnsupportedReason; message: string };

export const UNSUPPORTED_MESSAGES: Record<UnsupportedReason, string> = {
  next: "Next.js projects aren't supported. Content Pilot hosts static sites: Astro, Vite, or plain HTML.",
  ssr: "Server-rendered frameworks aren't supported. Content Pilot hosts static sites: Astro, Vite, or plain HTML.",
  astro_server:
    "This Astro project uses server output (output: 'server'). Content Pilot hosts static sites only, so switch to static output.",
  unknown:
    "We couldn't find an Astro, Vite, or plain HTML site here. Content Pilot hosts static sites: Astro, Vite, or plain HTML.",
};

const NEXT_CONFIG = /^next\.config\.(js|mjs|ts|cjs)$/;
const ASTRO_CONFIG = /^astro\.config\.(mjs|ts|mts|js|cjs)$/;
const VITE_CONFIG = /^vite\.config\.(ts|js|mts|mjs|cts|cjs)$/;

const SSR_DEPS = [
  "next",
  "nuxt",
  "@sveltejs/kit",
  "@remix-run/dev",
  "@react-router/dev",
  "@tanstack/react-start",
  "@tanstack/start",
  "@solidjs/start",
  "@builder.io/qwik-city",
];

const reject = (reason: UnsupportedReason): FrameworkCheck => ({
  ok: false,
  reason,
  message: UNSUPPORTED_MESSAGES[reason],
});

/** First file name (in precedence order) matching a config pattern. */
export const astroConfigName = (files: string[]) =>
  [
    "astro.config.mjs",
    "astro.config.ts",
    "astro.config.mts",
    "astro.config.js",
    "astro.config.cjs",
  ].find((name) => files.includes(name)) ?? null;

/**
 * Pure rule: root file names + package.json text + astro config text → verdict.
 * Same precedence as the pilot: static first, then Next, Astro, SSR, Vite.
 */
export function checkFrameworkFiles(input: {
  files: string[];
  packageJson: string | null;
  astroConfig: string | null;
}): FrameworkCheck {
  const { files } = input;
  if (input.packageJson === null) {
    return files.includes("index.html")
      ? { ok: true, framework: "static" }
      : reject("unknown");
  }
  let deps: Record<string, string> = {};
  try {
    const pkg = JSON.parse(input.packageJson) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    deps = { ...pkg.dependencies, ...pkg.devDependencies };
  } catch {
    deps = {};
  }
  if (files.some((f) => NEXT_CONFIG.test(f)) || deps.next) return reject("next");
  if (files.some((f) => ASTRO_CONFIG.test(f)) || deps.astro) {
    return input.astroConfig &&
      /output\s*:\s*['"`](server|hybrid)['"`]/.test(input.astroConfig)
      ? reject("astro_server")
      : { ok: true, framework: "astro" };
  }
  if (SSR_DEPS.some((dep) => deps[dep])) return reject("ssr");
  if (files.some((f) => VITE_CONFIG.test(f)) || deps.vite) {
    return { ok: true, framework: "vite" };
  }
  return reject("unknown");
}

type Octokit = ReturnType<typeof createOctokitInstance>;

const readText = async (
  octokit: Octokit,
  repo: { owner: string; repo: string; ref: string },
  path: string
) => {
  const { data } = await octokit.rest.repos.getContent({ ...repo, path });
  if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
    return null;
  }
  return Buffer.from(data.content, "base64").toString("utf8");
};

/** Reads the repo root on its default branch and runs checkFrameworkFiles. */
export async function checkGithubRepoFramework(
  octokit: Octokit,
  repo: { owner: string; repo: string; ref: string }
): Promise<FrameworkCheck> {
  // An empty repo 404s here: nothing to host, same verdict as no site.
  const data = await octokit.rest.repos
    .getContent({ ...repo, path: "" })
    .then((res) => res.data)
    .catch(() => []);
  const files = Array.isArray(data)
    ? data.filter((entry) => entry.type === "file").map((entry) => entry.name)
    : [];
  const packageJson = files.includes("package.json")
    ? await readText(octokit, repo, "package.json")
    : null;
  const astroName = astroConfigName(files);
  const astroConfig = astroName
    ? await readText(octokit, repo, astroName).catch(() => null)
    : null;
  return checkFrameworkFiles({ files, packageJson, astroConfig });
}
