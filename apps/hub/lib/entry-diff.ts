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

/** First string field names the item (its identity + row label). */
const primaryFieldName = (itemFields: Field[]): string | null =>
  itemFields.find((field) => field.type === "string")?.name ??
  itemFields[0]?.name ??
  null;

/** A short, human label for one array item (its primary value). */
const itemSummary = (item: unknown, primary: string | null): string => {
  if (primary && item && typeof item === "object") {
    const value = (item as Record<string, unknown>)[primary];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return formatDiffValue(item, 80);
};

/** Identity key for matching an item across old/new (primary value, else JSON). */
const itemKey = (item: unknown, primary: string | null): string => {
  if (primary && item && typeof item === "object") {
    const value = (item as Record<string, unknown>)[primary];
    if (typeof value === "string" && value.trim()) return `k:${value.trim()}`;
    if (typeof value === "number") return `k:${value}`;
  }
  return `j:${JSON.stringify(item ?? null)}`;
};

/**
 * Item-level diff for an array collection (the whole collection is one JSON
 * array file). Items are matched by identity (primary field), NOT by index —
 * so removing/reordering one item doesn't cascade into every later item like a
 * positional `computeEntryDiff` list diff would. Produces: one row per added /
 * removed item, and per-field rows for an edited item; a pure reorder collapses
 * to a single "Order" note.
 */
export const computeArrayCollectionDiff = (
  itemFields: Field[],
  oldArray: unknown[],
  newArray: unknown[]
): EntryDiffRow[] => {
  const primary = primaryFieldName(itemFields);
  const rows: EntryDiffRow[] = [];

  // Bucket old items by key (FIFO within a key so duplicate names still pair).
  const oldByKey = new Map<string, unknown[]>();
  for (const item of oldArray) {
    const key = itemKey(item, primary);
    const bucket = oldByKey.get(key);
    if (bucket) bucket.push(item);
    else oldByKey.set(key, [item]);
  }
  const takeOld = (key: string): { item: unknown } | null => {
    const bucket = oldByKey.get(key);
    if (bucket && bucket.length) return { item: bucket.shift() };
    return null;
  };

  // Walk new items in order → added or edited (unchanged/reordered skipped).
  newArray.forEach((newItem, i) => {
    const matched = takeOld(itemKey(newItem, primary));
    if (!matched) {
      pushRow(rows, `items.${i}`, "New item", undefined, itemSummary(newItem, primary));
      return;
    }
    if (isEqual(matched.item, newItem)) return;
    const label = itemSummary(newItem, primary);
    const sub = computeEntryDiff(
      itemFields,
      matched.item as Record<string, unknown>,
      newItem as Record<string, unknown>
    );
    for (const row of sub) {
      rows.push({
        ...row,
        fieldPath: `items.${i}.${row.fieldPath}`,
        label: `${label} › ${row.label}`,
      });
    }
  });

  // Anything left in the old buckets was removed.
  for (const bucket of oldByKey.values()) {
    for (const item of bucket) {
      pushRow(
        rows,
        `removed.${rows.length}`,
        "Removed item",
        itemSummary(item, primary),
        undefined
      );
    }
  }

  // Same items, different order → a single note instead of nothing.
  if (rows.length === 0 && !isEqual(oldArray, newArray)) {
    pushRow(
      rows,
      "items.order",
      "Order",
      "(previous order)",
      `Reordered ${newArray.length} item${newArray.length === 1 ? "" : "s"}`
    );
  }

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
