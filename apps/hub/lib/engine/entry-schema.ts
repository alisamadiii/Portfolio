/**
 * Collection-entry field schema, inferred from the entry's own JSON value.
 *
 * The manifest `cms.collections[].fields` is a flat, scalar-only vocabulary — it
 * can't describe the arrays (`schedule`, `intro`) and nested objects (`rsvp`,
 * `seo`) that entries actually contain, and building the form from it drops
 * every unmanifested key on save. So structure comes from the live JSON via
 * `inferFields`; the manifest only supplies nicer labels + rich widget hints
 * (select/date/image/…) for the scalar top-level fields it does declare.
 *
 * Returns the loose `{ name, label, type, list, fields, … }` field shape the
 * existing `collectionSchema`/`EntryForm` pipeline already consumes.
 */

import type { Field } from "@workspace/cms-core/types/field";

import { inferFields } from "./infer";

// The field pipeline (collectionSchema/EntryForm) treats fields as loose objects
// (e.g. `required` isn't on the strict `Field` type but is read by ListField),
// so we build with `any` and cast to `Field[]` at the boundary.
type LooseField = Record<string, any>;

// Manifest widget types worth adopting over a plain inferred string/text.
const RICH_TYPES = new Set([
  "select",
  "image",
  "date",
  "datetime",
  "boolean",
  "number",
]);

/**
 * Overlay a manifest field's metadata onto an inferred field.
 * - always take the manifest label + required (display only);
 * - structure always wins: never touch the `type` of a `list`/`object` field;
 * - for scalars, a manifest rich widget (select/image/date/…) upgrades a plain
 *   inferred `string`/`text`, but never downgrades an already-rich inferred type
 *   (image/date/datetime/url) — inference wins there.
 */
const overlay = (field: LooseField, manifest?: LooseField): LooseField => {
  if (!manifest) return field;
  const label =
    typeof manifest.label === "string" && manifest.label
      ? manifest.label
      : field.label;
  const next: LooseField = { ...field, label };
  if (manifest.required != null) next.required = manifest.required;

  const isContainer = field.list === true || field.type === "object";
  if (isContainer) return next;

  const inferredIsPlain = field.type === "string" || field.type === "text";
  if (inferredIsPlain && manifest.type && RICH_TYPES.has(manifest.type)) {
    next.type = manifest.type;
    if (manifest.options) next.options = manifest.options;
  }
  return next;
};

/**
 * Build the editor field list for one collection entry from its live value,
 * overlaying manifest hints on matching top-level scalar keys.
 */
export function entryFieldsFromValue(
  value: unknown,
  manifestFields: LooseField[] = []
): Field[] {
  const inferred = inferFields(value) as LooseField[];
  if (!manifestFields.length) return inferred as Field[];
  const byName = new Map(
    manifestFields
      .filter((field) => typeof field?.name === "string")
      .map((field) => [field.name as string, field] as const)
  );
  return inferred.map((field) => overlay(field, byName.get(field.name))) as Field[];
}
