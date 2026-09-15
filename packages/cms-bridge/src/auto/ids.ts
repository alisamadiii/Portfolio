/**
 * Random field IDs for auto mode.
 *
 * A field's identity is a `<role>_<4 base36>` ID stamped permanently into the
 * .astro source as `data-cms-field` — an element-level self-pin. Once stamped,
 * the key can never shift, no matter how elements are reordered. The role
 * prefix lets the hub derive labels and type detection from the key alone
 * (see apps/hub/lib/engine/infer.ts — regex mirrored there, keep in sync).
 */

import crypto from "node:crypto";

import type { FieldRole } from "../cli/types.js";

/** A minted auto ID: role prefix + 4-char base36 suffix. */
export const AUTO_ID_RE =
  /^(heading|title|subtitle|text|eyebrow|cta|image)_[a-z0-9]{4}$/;

const SUFFIX_LENGTH = 4;
const BASE36 = "abcdefghijklmnopqrstuvwxyz0123456789";

export type IdRng = () => string;

/** Default rng: crypto-random 4-char base36 suffix. */
export const randomSuffix: IdRng = () => {
  const bytes = crypto.randomBytes(SUFFIX_LENGTH);
  let out = "";
  for (let i = 0; i < SUFFIX_LENGTH; i++) out += BASE36[bytes[i] % 36];
  return out;
};

/**
 * Mint a fresh field ID for a role, avoiding everything in `taken` (adopted
 * paths, already-assigned candidate paths, existing page-JSON keys). Reserves
 * the compound siblings/leaves the role implies — mirroring what
 * `assignPaths` reserves for readable keys — and adds them to `taken`.
 */
export function mintFieldId(
  role: FieldRole,
  taken: Set<string>,
  rng: IdRng = randomSuffix
): string {
  let id: string;
  do {
    id = `${role}_${rng()}`;
  } while (taken.has(id) || (role === "image" && taken.has(`${id}Alt`)));
  taken.add(id);
  if (role === "image") taken.add(`${id}Alt`);
  if (role === "cta") {
    taken.add(`${id}.label`);
    taken.add(`${id}.link`);
  }
  return id;
}

/**
 * The candidate path an existing `data-cms-field` attr value pins. For cta
 * elements the attr carries the `.link` leaf (the Link.astro contract), so
 * strip it back to the base path; every other role uses the attr verbatim.
 * Works for random IDs (`cta_r7t3.link` → `cta_r7t3`) and legacy/manual keys
 * (`hero.cta.link` → `hero.cta`) alike.
 */
export function pathFromFieldAttr(attrValue: string, role: FieldRole): string {
  if (role === "cta" && attrValue.endsWith(".link")) {
    return attrValue.slice(0, -".link".length);
  }
  return attrValue;
}
