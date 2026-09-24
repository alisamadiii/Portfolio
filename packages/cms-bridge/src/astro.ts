import { readFileSync } from "node:fs";
import { parse } from "@astrojs/compiler";
import type { AstroIntegration } from "astro";
import {
  findInsertOffset,
  formatSrc,
  SKIP_TAGS,
  spliceInserts,
  SRC_ATTR,
} from "./core/annotate.js";
import type { Insert } from "./core/annotate.js";
import type { BridgeOptions, BridgeRuntimeConfig } from "./core/options.js";

/** Recursively collect annotation inserts for every plain HTML element node. */
function collectInserts(
  node: any,
  buf: Buffer,
  project: string | undefined,
  srcPath: string,
  out: Insert[]
): void {
  if (
    node.type === "element" &&
    !SKIP_TAGS.has(node.name) &&
    node.position?.start
  ) {
    const offset = findInsertOffset(buf, node.position.start.offset);
    if (offset !== -1) {
      out.push({
        offset,
        text: ` ${SRC_ATTR}="${formatSrc(project, srcPath, node.position.start.line)}"`,
      });
    }
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children)
      collectInserts(child, buf, project, srcPath, out);
  }
}

/**
 * Annotate one .astro source string: stamp `data-cms-src="<project>:<srcPath>:<line>"`
 * onto every plain HTML element. Returns the new source, or null when there is
 * nothing to annotate. Pure and framework-context-free so it is unit-testable
 * and reusable by other adapters. Throws only if the compiler parse fails —
 * the Vite plugin below catches that and fails open.
 */
export async function annotateAstroSource(
  source: string,
  opts: { project?: string; srcPath: string }
): Promise<string | null> {
  const { ast } = await parse(source, { position: true });
  const buf = Buffer.from(source);
  const inserts: Insert[] = [];
  collectInserts(ast, buf, opts.project, opts.srcPath, inserts);
  return spliceInserts(buf, inserts);
}

/**
 * cms-bridge — build-time source annotator + click-to-submit overlay for Astro.
 *
 * When enabled:
 *  - Every rendered HTML element gets `data-cms-src="<project>:src/…/File.astro:LINE"`
 *    (its owning source file + line), surviving production builds.
 *  - Every page loads a tiny overlay script. It is inert until the page is
 *    opened with the edit-mode URL param carrying an intake token (the hub
 *    injects it into the iframe). Then hover shows a cursor box around editable
 *    elements; clicking opens a popover where the client describes a change,
 *    which is POSTed to the content-pilot intake endpoint to create an edit job.
 *
 * The intake token is never baked into the built site — it arrives at runtime
 * via the URL param and is sent as an Authorization header.
 *
 * When disabled: nothing is injected at all.
 */
export default function cmsBridge({
  repoId,
  enabled = true,
  project,
  endpoint = "https://pilot.alisamadii.com",
  branch = "main",
  pathPrefix = "",
}: BridgeOptions): AstroIntegration {
  return {
    name: "cms-bridge",
    hooks: {
      "astro:config:setup": ({ config, injectScript, updateConfig, logger }) => {
        if (!enabled) return;
        if (!repoId) {
          logger.warn(
            "cms-bridge: repoId is required — edit submissions will fail."
          );
        }

        const rootDir = config.root;

        updateConfig({
          vite: {
            plugins: [
              {
                name: "cms-src",
                // Hook-level order:"pre" is required — Astro's own .astro
                // transform has no order, so this is guaranteed to run first
                // and receive raw .astro source (plugin position alone is not
                // enough; Astro appends integration plugins after its own).
                transform: {
                  order: "pre",
                  async handler(source: string, id: string) {
                    if (!id.endsWith(".astro") || id.includes("node_modules"))
                      return null;
                    // Ordering regression guard: compiled output, not raw source.
                    if (source.includes("astro/compiler-runtime")) {
                      logger.warn(
                        `cms-src received compiled output for ${id} — skipping (plugin ordering broke)`
                      );
                      return null;
                    }
                    try {
                      const srcPath =
                        pathPrefix +
                        id
                          .slice(rootDir.pathname.length)
                          .replace(/^\/+/, "")
                          .split("\\")
                          .join("/");
                      const code = await annotateAstroSource(source, {
                        project,
                        srcPath,
                      });
                      if (code == null) return null;
                      return { code, map: null };
                    } catch (err) {
                      // Fail-open: an annotation failure must never break a build.
                      logger.warn(
                        `cms-src skipped ${id}: ${err instanceof Error ? err.message : err}`
                      );
                      return null;
                    }
                  },
                },
              },
            ],
          },
        });

        // Runtime config for the overlay — repo identity only, NO secret. The
        // intake token arrives at runtime via the edit-mode URL param.
        const runtime: BridgeRuntimeConfig = {
          project,
          endpoint,
          repoId,
          branch,
        };
        injectScript(
          "page",
          `window.__CMS_BRIDGE__=${JSON.stringify(runtime)};`
        );

        // The browser overlay (built IIFE), injected inline on every page.
        injectScript(
          "page",
          readFileSync(new URL("./client.global.js", import.meta.url), "utf-8")
        );
      },
    },
  };
}
