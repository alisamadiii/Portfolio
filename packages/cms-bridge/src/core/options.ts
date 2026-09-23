/**
 * Shared option types for the cms-bridge source annotator. Framework-agnostic:
 * the Astro adapter (and future Next/React adapters) all take `BridgeOptions`
 * and inject `BridgeRuntimeConfig` into the page for the browser overlay.
 */

export interface BridgeOptions {
  /** Master switch — when false the integration is a complete no-op. */
  enabled?: boolean;
  /**
   * Prefix token baked as the first segment of every `data-cms-src` value
   * (`<project>:<file>:<line>`). Names the sub-project so the AI editor knows
   * which top-level directory of the repo to open. Omit for single-project
   * repos (the attribute then carries just `<file>:<line>`).
   */
  project?: string;
  /** content-pilot base URL, e.g. "https://pilot.alisamadii.com". */
  endpoint: string;
  /** GitHub numeric repo id — the content-pilot join key (not secret). */
  repoId: number;
  /** Repo owner, e.g. "acme-inc" (not secret). */
  owner: string;
  /** Repo name, e.g. "website" (not secret). */
  repo: string;
  /** Default target branch for edits; the popover can override it. */
  branch?: string;
  /**
   * Prepended to the file path portion for monorepo subfolders, e.g.
   * "apps/marketing/". Leave empty when the framework root is the repo root.
   */
  pathPrefix?: string;
}

/**
 * The subset of options injected into the page as `window.__CMS_BRIDGE__` for
 * the browser overlay. NO secret is embedded — the intake token is supplied at
 * runtime via the edit-mode URL param (the hub controls the iframe), never
 * baked into the built site. Repo identity here is public info.
 */
export interface BridgeRuntimeConfig {
  project?: string;
  endpoint: string;
  repoId: number;
  owner: string;
  repo: string;
  branch: string;
}
