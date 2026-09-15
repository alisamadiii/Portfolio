/**
 * Seed store: collects JSON additions from concurrent page transforms and
 * flushes them to the pages JSON file.
 *
 * Rules:
 *  - Add-only (`addAtPath`): existing keys ALWAYS win, even against a stale
 *    queue — a client/hub edit can never be clobbered.
 *  - Flush re-reads the file first (picks up external edits), applies the
 *    queue, and writes ONLY when something landed AND the serialized output
 *    differs from what was read. The dirty-check is what bounds dev-server
 *    HMR to at most one extra reload.
 *  - All fs inside a flush is synchronous, so flushes never interleave.
 *    (Two separate processes — dev server + CLI — are not synchronized;
 *    acceptable, out of scope.)
 */

import fs from "node:fs";

import {
  addAtPath,
  readJsonAt,
  setAtPath,
  writePagesJson,
} from "../cli/core/json-store.js";
import type { AutoAddition } from "./transform.js";

/** Seeds only land in a plain-object root — anything else is treated as {}. */
const asObjectRoot = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export class SeedStore {
  private queue: Array<{ pageKey: string; addition: AutoAddition }> = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private pagesFile: string,
    private warn: (message: string) => void = console.warn
  ) {}

  queueAdditions(pageKey: string, additions: AutoAddition[]): void {
    for (const addition of additions) this.queue.push({ pageKey, addition });
  }

  scheduleFlush(delayMs = 150): void {
    if (this.queue.length === 0) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flushSync(), delayMs);
    // Never keep the process alive just for a pending flush.
    this.timer.unref?.();
  }

  /**
   * Dev-sync path: OVERWRITE values (the dev's source edit wins). Synchronous
   * read-modify-write with the same dirty-check as flushSync. Returns true
   * when the file was written.
   */
  applyOverwrites(
    pageKey: string,
    overwrites: Array<{ path: string; value: unknown }>
  ): boolean {
    if (overwrites.length === 0) return false;
    try {
      const before = fs.existsSync(this.pagesFile)
        ? fs.readFileSync(this.pagesFile, "utf8")
        : null;
      const pagesJson = asObjectRoot(
        before !== null ? readJsonAt(this.pagesFile) : null
      );
      // Flat contract: pageKey "" ⇒ keys live at the ROOT of the pages JSON.
      const pageObject =
        pageKey === ""
          ? pagesJson
          : ((pagesJson[pageKey] as Record<string, unknown> | undefined) ?? {});
      if (pageKey !== "" && pagesJson[pageKey] === undefined) {
        pagesJson[pageKey] = pageObject;
      }
      for (const { path, value } of overwrites) {
        setAtPath(pageObject, path, value);
      }
      if (
        before !== null &&
        JSON.stringify(JSON.parse(before)) === JSON.stringify(pagesJson)
      ) {
        return false;
      }
      writePagesJson(this.pagesFile, pagesJson);
      return true;
    } catch (error) {
      this.warn(
        `[cms-bridge auto] sync overwrite failed: ${error instanceof Error ? error.message : error}`
      );
      return false;
    }
  }

  flushSync(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.queue.length === 0) return;
    const pending = this.queue;
    this.queue = [];

    try {
      const before = fs.existsSync(this.pagesFile)
        ? fs.readFileSync(this.pagesFile, "utf8")
        : null;
      const pagesJson = asObjectRoot(
        before !== null ? readJsonAt(this.pagesFile) : null
      );

      let landed = 0;
      for (const { pageKey, addition } of pending) {
        // Flat contract: pageKey "" ⇒ keys live at the ROOT.
        const pageObject =
          pageKey === ""
            ? pagesJson
            : ((pagesJson[pageKey] as Record<string, unknown> | undefined) ?? {});
        if (pageKey !== "" && pagesJson[pageKey] === undefined) {
          pagesJson[pageKey] = pageObject;
        }
        if (addAtPath(pageObject, addition.path, addition.value)) landed++;
      }
      if (landed === 0) return;

      // Dirty-check through a real serialization pass.
      const tmpCheck = JSON.stringify(pagesJson);
      if (before !== null && JSON.stringify(JSON.parse(before)) === tmpCheck) {
        return;
      }
      writePagesJson(this.pagesFile, pagesJson);
      this.warn(
        `[cms-bridge auto] seeded ${landed} new key(s) into ${this.pagesFile}`
      );
    } catch (error) {
      this.warn(
        `[cms-bridge auto] seeding failed: ${error instanceof Error ? error.message : error}`
      );
    }
  }
}
