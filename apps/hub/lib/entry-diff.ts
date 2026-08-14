import type { Field } from "@workspace/cms-core/types/field";

import { initializeState, sanitizeObject } from "@workspace/cms-core/schema";

/**
 * Field-level diff between two content objects, driven by the collection
 * schema. Both sides are normalized with initializeState so schema defaults
 * don't produce noisy diffs. Used by the publish review dialog and the
 * per-field changed indicators in the editor.
 */

export type EntryDiffRow = {
  /** RHF-style path, e.g. "seo.title" or "sections.2.heading" */
  fieldPath: string;
  label: string;
  old: unknown;
  new: unknown;
  kind: "added" | "removed" | "changed";
};

const fieldLabel = (field: Field) =>
  field.label === false ? field.name : field.label || field.name;

const isEqual = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const isEmpty = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

const diffValue = (
  field: Field,
  oldValue: unknown,
  newValue: unknown,
  path: string,
  labelPrefix: string,
  rows: EntryDiffRow[]
) => {
  if (isEqual(oldValue, newValue)) return;

  const label = labelPrefix
    ? `${labelPrefix} › ${fieldLabel(field)}`
    : fieldLabel(field);

  if (field.list) {
    const oldList = Array.isArray(oldValue) ? oldValue : [];
    const newList = Array.isArray(newValue) ? newValue : [];
    const max = Math.max(oldList.length, newList.length);
    for (let i = 0; i < max; i++) {
      const itemPath = `${path}.${i}`;
      const itemLabel = `${label} #${i + 1}`;
      const oldItem = oldList[i];
      const newItem = newList[i];
      if (isEqual(oldItem, newItem)) continue;
      if (field.type === "object" && field.fields) {
        diffObjectFields(
          field.fields,
          oldItem ?? {},
          newItem ?? {},
          itemPath,
          itemLabel,
          rows
        );
      } else {
        pushRow(rows, itemPath, itemLabel, oldItem, newItem);
      }
    }
    return;
  }

  if (field.type === "object" && field.fields) {
    diffObjectFields(
      field.fields,
      (oldValue as Record<string, unknown>) ?? {},
      (newValue as Record<string, unknown>) ?? {},
      path,
      label,
      rows
    );
    return;
  }

  pushRow(rows, path, label, oldValue, newValue);
};

const pushRow = (
  rows: EntryDiffRow[],
  fieldPath: string,
  label: string,
  oldValue: unknown,
  newValue: unknown
) => {
  rows.push({
    fieldPath,
    label,
    old: oldValue,
    new: newValue,
    kind: isEmpty(oldValue) ? "added" : isEmpty(newValue) ? "removed" : "changed",
  });
};

const diffObjectFields = (
  fields: Field[],
  oldObject: Record<string, unknown>,
  newObject: Record<string, unknown>,
  pathPrefix: string,
  labelPrefix: string,
  rows: EntryDiffRow[]
) => {
  for (const field of fields) {
    if (field.hidden) continue;
    const path = pathPrefix ? `${pathPrefix}.${field.name}` : field.name;
    diffValue(
      field,
      oldObject?.[field.name],
      newObject?.[field.name],
      path,
      labelPrefix,
      rows
    );
  }
};

export const computeEntryDiff = (
  fields: Field[],
  oldContentObject: Record<string, unknown> | null | undefined,
  newValues: Record<string, unknown> | null | undefined
): EntryDiffRow[] => {
  const oldNormalized = initializeState(
    fields,
    sanitizeObject(oldContentObject ?? {})
  );
  const newNormalized = initializeState(
    fields,
    sanitizeObject(newValues ?? {})
  );
  const rows: EntryDiffRow[] = [];
  diffObjectFields(fields, oldNormalized, newNormalized, "", "", rows);
  return rows;
};

/** Format a diff value for display (tooltips, diff rows). */
export const formatDiffValue = (value: unknown, maxLength = 300): string => {
  if (value === undefined || value === null || value === "") return "(empty)";
  let text: string;
  if (typeof value === "string") {
    // Strip HTML from rich text for plain-text comparison display
    text = value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || "(empty)";
  } else if (typeof value === "object") {
    text = JSON.stringify(value, null, 2);
  } else {
    text = String(value);
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
};
