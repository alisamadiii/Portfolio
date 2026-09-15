/**
 * Auto mode: build-time CMS wiring for plain HTML.
 *
 * A Vite pre-transform (registered by the Astro integration when
 * `cmsBridge({ auto: true })`) parses raw `.astro` pages, annotates safe
 * elements with `data-cms-*` attrs, substitutes values from the project's
 * pages JSON (JSON wins), and seeds missing keys from the markup literals.
 *
 * Node-only — shipped as the `./auto` export and dynamically imported from
 * the integration hook so the browser bundle stays clean.
 */

import fs from "node:fs";
import path from "node:path";

import { readJsonAt } from "../cli/core/json-store.js";
import { loadClaims, saveClaims, type ClaimsMap } from "./claims.js";
import {
  syncArraysJsonToSource,
  syncArraysSourceToJson,
} from "./frontmatter-arrays.js";
import { discoverContract, pageKeyForFile } from "./contract.js";
import { SeedStore } from "./store.js";
import { syncJsonToSource, syncSourceToJson } from "./sync.js";
import { autoTransformPage } from "./transform.js";

export { discoverContract, pageKeyForFile } from "./contract.js";
export { SeedStore } from "./store.js";
export {
  autoTransformPage,
  type AutoAddition,
  type AutoTransformResult,
} from "./transform.js";

export type AutoPluginOptions = {
  /** Absolute project root (astro config.root). */
  root: string;
  /** Optional logger (defaults to console.warn). */
  warn?: (message: string) => void;
};

/** Minimal structural Vite plugin type — vite isn't a dependency. */
type VitePluginLike = {
  name: string;
  enforce: "pre";
  transform: {
    order: "pre";
    handler(
      this: { addWatchFile?: (file: string) => void } | void,
      code: string,
      id: string
    ): Promise<{ code: string; map: null } | null>;
  };
  buildEnd?: () => void;
  closeBundle?: () => void;
  configureServer?: (server: {
    watcher: {
      add(file: string): void;
      on(event: "change", cb: (file: string) => void): void;
    };
  }) => void;
};

export function autoCmsVitePlugin(options: AutoPluginOptions): VitePluginLike {
  const trace = process.env.CMS_BRIDGE_TRACE
    ? (msg: string) => {
        try {
          fs.appendFileSync(process.env.CMS_BRIDGE_TRACE as string, `[pid ${process.pid}] ${msg}\n`);
        } catch {}
      }
    : (_msg: string) => {};
  trace(`factory root=${options.root}`);
  const warn = options.warn ?? ((message: string) => console.warn(message));
  const root = options.root;
  const pagesDir = path.join(root, "src", "pages") + path.sep;
  const srcDir = path.join(root, "src") + path.sep;
  const contract = discoverContract(root);
  const store = new SeedStore(contract.pagesFile, warn);

  // Self-heal: a missing/empty/invalid pages JSON would crash Vite's own
  // JSON plugin before anything can reseed it. Reset it to `{}` — the
  // transforms then reseed every key from the markup literals.
  const healPagesFile = (): void => {
    try {
      const raw = fs.existsSync(contract.pagesFile)
        ? fs.readFileSync(contract.pagesFile, "utf8")
        : "";
      if (raw.trim() !== "") {
        const parsed = JSON.parse(raw);
        // Root must be a plain object — an array/string/null root parses
        // fine but silently swallows every seed (JSON.stringify drops
        // non-index props on arrays) and crashes page imports.
        if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
          return;
        }
      }
    } catch {
      // fall through to reset
    }
    try {
      fs.writeFileSync(contract.pagesFile, "{}\n");
      warn(
        `[cms-bridge auto] ${path.basename(contract.pagesFile)} was empty or invalid — reset to {} (keys reseed from markup)`
      );
    } catch {
      // read-only fs — the JSON import will fail loudly on its own
    }
  };
  healPagesFile();

  // Flat contract: PERSISTENT claim registry (repo-relative file → keys it
  // bound), loaded from root _fields.json and rewritten after every
  // transform. A file re-binds with every OTHER file's keys pre-claimed
  // (identical literals in two files always mint separate keys), and its OWN
  // persisted keys scope the ordinal fallback — which is what lets a cold
  // build rebind an element whose value the hub edited between dev sessions
  // instead of minting a duplicate.
  const claims: ClaimsMap = contract.flat ? loadClaims(root) : new Map();
  const claimsExcluding = (relPath: string): Set<string> => {
    const out = new Set<string>();
    for (const [owner, keys] of claims) {
      if (owner === relPath) continue;
      for (const key of keys) out.add(key);
    }
    return out;
  };
  const recordClaims = (relPath: string, keys: string[]): void => {
    claims.set(relPath, new Set(keys));
    saveClaims(root, claims, warn);
  };
  const transformedFiles = new Set<string>();
  /** Source files this build rewrote (literal/array syncs) — formatted after. */
  const sourceWrites = new Set<string>();

  // After a build that rewrote sources, run the PROJECT's prettier (its own
  // version, config, and plugins) on just those files so sync rewrites match
  // the repo style. No prettier in the project → silently skipped.
  const formatWrittenSources = async (): Promise<void> => {
    if (sourceWrites.size === 0) return;
    const files = [...sourceWrites];
    sourceWrites.clear();
    try {
      const { createRequire } = await import("node:module");
      const { spawnSync } = await import("node:child_process");
      const projectRequire = createRequire(path.join(root, "package.json"));
      // The project's own prettier CLI — same config/plugins as `pnpm format`.
      const bin = projectRequire.resolve("prettier/bin/prettier.cjs");
      const result = spawnSync(process.execPath, [bin, "--write", ...files], {
        cwd: root,
        stdio: "ignore",
        timeout: 30_000,
      });
      if (result.status === 0) {
        warn(`[cms-bridge auto] formatted ${files.length} synced source file(s)`);
      }
    } catch {
      // project has no prettier — sync output stands as written
    }
  };

  // After a FULL build (every in-scope file transformed this session), any
  // auto-ID SCALAR key bound by no file is an orphan — typically a duplicate
  // generation left behind by out-of-band JSON edits. Orphans are landmines:
  // the hub shows them as extra fields and edits to them render nowhere.
  // Arrays and non-auto keys are never touched.
  const pruneOrphans = (): void => {
    if (!contract.flat) return;
    const scoped = allScopedFiles();
    if (scoped.length === 0) return;
    for (const rel of scoped) if (!transformedFiles.has(rel)) return; // partial build
    try {
      const raw = fs.readFileSync(contract.pagesFile, "utf8");
      const pagesJson = JSON.parse(raw) as Record<string, unknown>;
      if (!pagesJson || typeof pagesJson !== "object" || Array.isArray(pagesJson)) return;
      const bound = new Set<string>();
      for (const keys of claims.values()) {
        for (const key of keys) {
          bound.add(key);
          bound.add(`${key}Alt`);
        }
      }
      const orphans = Object.keys(pagesJson).filter(
        (key) =>
          !bound.has(key) &&
          !Array.isArray(pagesJson[key]) &&
          /^(heading|title|subtitle|text|eyebrow|cta|image)_[a-z0-9]{4}(Alt)?$/.test(key)
      );
      if (orphans.length === 0) return;
      for (const key of orphans) delete pagesJson[key];
      fs.writeFileSync(contract.pagesFile, `${JSON.stringify(pagesJson, null, 2)}\n`);
      warn(
        `[cms-bridge auto] pruned ${orphans.length} orphan key(s) no element binds: ${orphans.join(", ")}`
      );
    } catch {
      // never fail a build over pruning
    }
  };

  const allScopedFiles = (): string[] => {
    const dir = contract.flat ? path.join(root, "src") : path.join(root, "src", "pages");
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir, { recursive: true, encoding: "utf8" })
      .filter((name) => name.endsWith(".astro") && !name.includes("["))
      .map((name) => path.relative(root, path.join(dir, name)));
  };

  /** Is this file in transform scope? Flat ⇒ all src .astro; legacy ⇒ pages. */
  const inScope = (file: string): boolean =>
    file.endsWith(".astro") &&
    !file.includes("[") &&
    (contract.flat ? file.startsWith(srcDir) : file.startsWith(pagesDir));

  return {
    name: "cms-bridge:auto",
    // Both belts: plugin-level enforce AND hook-level order — Astro's own
    // .astro transform is orderless, so this always receives raw source.
    enforce: "pre",
    transform: {
      order: "pre",
      async handler(code: string, id: string) {
        // Sub-requests (?astro&type=script/style) carry a FRAGMENT of the
        // file as `code` — transforming (or syncing!) against it would write
        // that fragment back over the real source. Primary module only.
        if (id.includes("?")) return null;
        const file = id;
        if (!inScope(file)) return null;
        // Ordering regression guard: compiled output, not raw source.
        if (code.includes("astro/compiler-runtime")) {
          warn(`[cms-bridge auto] received compiled output for ${file} — skipped (plugin ordering broke)`);
          return null;
        }

        // Flat: keys are global — pageKey "" seeds at the JSON root.
        let pageKey = "";
        if (!contract.flat) {
          const relToPages = path.relative(path.join(root, "src", "pages"), file);
          const resolved = pageKeyForFile(contract, relToPages);
          if (!resolved) return null;
          pageKey = resolved;
        }

        // Dev live-reload: register the pages JSON as a dependency of this
        // page, so editing the JSON (by hand or via the hub) invalidates the
        // module and the dev server re-transforms + reloads immediately.
        this?.addWatchFile?.(contract.pagesFile);

        // Re-read per transform: cheap, and picks up hub/git edits in dev.
        // Queued-but-unflushed seeds are overlaid (read-your-writes) so a
        // second transform of the same file in one build binds the keys the
        // first pass minted instead of minting again.
        const pagesJson = store.overlayPending(
          readJsonAt(contract.pagesFile) ?? {},
          pageKey
        );
        const pageJson = contract.flat
          ? pagesJson
          : ((pagesJson[pageKey] as Record<string, unknown> | undefined) ?? {});

        const relPath = path.relative(root, file);
        const result = await autoTransformPage(code, {
          relPath,
          pageKey,
          pageJson,
          warn,
          flat: contract.flat,
          externalClaims: contract.flat ? claimsExcluding(relPath) : undefined,
          ownClaims: contract.flat ? claims.get(relPath) : undefined,
        });
        if (contract.flat) transformedFiles.add(relPath);
        trace(`transform ${relPath} → ${result ? `${result.additions.length} additions, ${result.autoPaths.length} paths` : "null"}`);
        if (!result) return null;

        if (contract.flat) {
          recordClaims(relPath, result.autoPaths);
          // Keep the SOURCE literals converged with the JSON on builds too —
          // not just in dev. A hub edit followed by `build` (no dev session)
          // renders correctly either way (substitution), but the .astro
          // literal would otherwise show stale copy until the next dev run.
          // Compare-before-write; read-only CI just skips.
          try {
            const { newSource } = await syncJsonToSource(
              code,
              relPath,
              pageKey,
              pageJson,
              warn,
              {
                flat: true,
                externalClaims: claimsExcluding(relPath),
                ownClaims: claims.get(relPath),
              }
            );
            // Lifted const arrays sync too — the source literal and the JSON
            // array never disagree, exactly like scalar fields.
            const base = newSource ?? code;
            const arraySynced = syncArraysJsonToSource(base, pageJson, {
              own: claims.get(relPath),
              foreign: claimsExcluding(relPath),
            });
            const final = arraySynced ?? (newSource !== null ? newSource : null);
            if (final !== null && final !== code) {
              fs.writeFileSync(file, final);
              sourceWrites.add(file);
            }
          } catch {
            // never fail the build over a literal sync
          }
        }

        if (result.additions.length > 0) {
          store.queueAdditions(pageKey, result.additions);
          store.scheduleFlush();
        }
        return { code: result.code, map: null };
      },
    },
    buildEnd() {
      store.flushSync();
    },
    closeBundle() {
      trace(`closeBundle transformed=${transformedFiles.size}`);
      store.flushSync();
      pruneOrphans();
      // fire-and-forget: formatting must never fail or block the build
      void formatWrittenSources();
    },
    // Two-way dev sync — the source literal and the JSON value stay identical:
    //  - pages JSON changed (hub / hand edit) → rewrite page literals to match.
    //    The .astro file change then flows through Astro's own HMR (no manual
    //    full-reload).
    //  - a page changed (dev edit) → overwrite differing JSON values (the
    //    dev's edit wins).
    // Both directions compare-before-write, so every edit settles in one round
    // trip and self-triggered watcher events are no-ops.
    configureServer(server) {
      const fsMod = fs;
      const jsonTarget = path.resolve(contract.pagesFile);
      server.watcher.add(contract.pagesFile);

      const scopedFiles = (): string[] => {
        const dir = contract.flat
          ? path.join(root, "src")
          : path.join(root, "src", "pages");
        if (!fsMod.existsSync(dir)) return [];
        return fsMod
          .readdirSync(dir, { recursive: true, encoding: "utf8" })
          .filter((name) => name.endsWith(".astro") && !name.includes("["))
          .map((name) => path.join(dir, name));
      };

      const pageKeyFor = (file: string): string | null => {
        if (contract.flat) return "";
        const rel = path.relative(path.join(root, "src", "pages"), file);
        return pageKeyForFile(contract, rel);
      };

      const pageJsonFor = (
        pagesJson: Record<string, unknown>,
        pageKey: string
      ): Record<string, unknown> =>
        contract.flat
          ? pagesJson
          : ((pagesJson[pageKey] as Record<string, unknown> | undefined) ?? {});

      server.watcher.on("change", async (changed) => {
        const resolved = path.resolve(changed);
        if (process.env.CMS_BRIDGE_DEBUG) warn(`[cms-bridge auto] change: ${resolved}`);

        // JSON → source
        if (resolved === jsonTarget) {
          healPagesFile(); // a wipe mid-dev must not crash the JSON import
          const pagesJson = readJsonAt(contract.pagesFile) ?? {};
          for (const file of scopedFiles()) {
            const pageKey = pageKeyFor(file);
            if (pageKey === null) continue;
            const source = fsMod.readFileSync(file, "utf8");
            const { newSource } = await syncJsonToSource(
              source,
              path.relative(root, file),
              pageKey,
              pageJsonFor(pagesJson, pageKey),
              warn,
              contract.flat
                ? {
                    flat: true,
                    externalClaims: claimsExcluding(path.relative(root, file)),
                    ownClaims: claims.get(path.relative(root, file)),
                  }
                : undefined
            );
            const base = newSource ?? source;
            const arraySynced = contract.flat
              ? syncArraysJsonToSource(base, pageJsonFor(pagesJson, pageKey), {
                  own: claims.get(path.relative(root, file)),
                  foreign: claimsExcluding(path.relative(root, file)),
                })
              : null;
            const final = arraySynced ?? newSource;
            if (final !== null && final !== source) {
              fsMod.writeFileSync(file, final);
            }
          }
          return;
        }

        // source → JSON
        if (inScope(resolved)) {
          const pageKey = pageKeyFor(resolved);
          if (pageKey === null) return;
          const pagesJson = readJsonAt(contract.pagesFile) ?? {};
          const source = fsMod.readFileSync(resolved, "utf8");
          const overwrites = await syncSourceToJson(
            source,
            path.relative(root, resolved),
            pageKey,
            pageJsonFor(pagesJson, pageKey),
            contract.flat
              ? {
                  flat: true,
                  externalClaims: claimsExcluding(path.relative(root, resolved)),
                  ownClaims: claims.get(path.relative(root, resolved)),
                }
              : undefined
          );
          const arrayOverwrites = contract.flat
            ? syncArraysSourceToJson(source, pageJsonFor(pagesJson, pageKey), {
                own: claims.get(path.relative(root, resolved)),
                foreign: claimsExcluding(path.relative(root, resolved)),
              })
            : [];
          store.applyOverwrites(pageKey, [...overwrites, ...arrayOverwrites]);
        }
      });
    },
  };
}

export { syncJsonToSource, syncSourceToJson } from "./sync.js";
