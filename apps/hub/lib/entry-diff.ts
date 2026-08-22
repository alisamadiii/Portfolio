import type { Field } from "@workspace/cms-core/types/field";

import { initializeState, sanitizeObject } from "@workspace/cms-core/schema";

/**
 * Field-level diff between two content objects, driven by the collection
 * schema. Both sides are normalized with initializeState so schema defaults
 * don't produce noisy diffs. Used by the publish review dialog and the
 * per-field changed indicators in the editor.
 *
 * Array items (object lists and whole-file array collections) are matched by
 * IDENTITY, never by index — an insert at the front must produce exactly one
 * "New item" row, not a cascade of changed/removed rows for every shifted
 * position. Matching runs in two passes: primary-field key (FIFO buckets so
 * duplicates still pair), then a fuzzy field-overlap pass so an item whose
 * identifying field was edited still diffs as "changed" instead of a
 * remove + add pair.
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
    if (field.type === "object" && field.fields) {
      // Items were already normalized by computeEntryDiff's initializeState.
      diffArrayItems(
        field.fields,
        oldList as Record<string, unknown>[],
        newList as Record<string, unknown>[],
        path,
        label,
        rows
      );
    } else {
      diffScalarList(oldList, newList, path, label, rows);
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

/**
 * Multiset diff for a scalar list (tags, image paths…). Values are matched
 * by equality regardless of position, so inserting at the front yields one
 * "added" row instead of every index reading as changed.
 */
const diffScalarList = (
  oldList: unknown[],
  newList: unknown[],
  path: string,
  label: string,
  rows: EntryDiffRow[]
) => {
  const before = rows.length;
  const oldByKey = new Map<string, number>();
  for (const item of oldList) {
    const key = JSON.stringify(item ?? null);
    oldByKey.set(key, (oldByKey.get(key) ?? 0) + 1);
  }
  newList.forEach((item, i) => {
    const key = JSON.stringify(item ?? null);
    const count = oldByKey.get(key) ?? 0;
    if (count > 0) {
      oldByKey.set(key, count - 1);
      return;
    }
    pushRow(rows, `${path}.${i}`, `${label} #${i + 1}`, undefined, item);
  });
  let removedIndex = 0;
  for (const [key, count] of oldByKey) {
    for (let i = 0; i < count; i++) {
      pushRow(
        rows,
        `${path}.removed.${removedIndex++}`,
        `${label} (removed)`,
        JSON.parse(key),
        undefined
      );
    }
  }
  if (rows.length === before && !isEqual(oldList, newList)) {
    pushRow(
      rows,
      `${path}.order`,
      `${label} › Order`,
      "(previous order)",
      `Reordered ${newList.length} item${newList.length === 1 ? "" : "s"}`
    );
  }
};

/** Names that identify an item better than an arbitrary first string field. */
const ID_LIKE = ["id", "slug", "key", "name", "title", "label", "heading"];

/** First non-list string field names the item (its identity + row label). */
const primaryFieldName = (itemFields: Field[]): string | null =>
  itemFields.find(
    (field) =>
      !field.list &&
      field.type === "string" &&
      ID_LIKE.includes(field.name.toLowerCase())
  )?.name ??
  itemFields.find((field) => !field.list && field.type === "string")?.name ??
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

/** Normalize one array item so cosmetic rewrites (key order, injected
 * defaults) don't break JSON-based identity matching. */
const normalizeItem = (
  itemFields: Field[],
  item: unknown
): Record<string, unknown> =>
  initializeState(
    itemFields,
    sanitizeObject(
      item && typeof item === "object"
        ? (item as Record<string, unknown>)
        : {}
    )
  );

/** Flatten a value into a multiset of primitive leaves (empties skipped —
 * mirrors sanitizeObject semantics). Structure-agnostic: nested objects and
 * lists all contribute their scalar contents. */
const collectLeaves = (value: unknown, out: string[]): void => {
  if (value === undefined || value === null || value === "") return;
  if (Array.isArray(value)) {
    for (const item of value) collectLeaves(item, out);
    return;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value)) collectLeaves(item, out);
    return;
  }
  out.push(JSON.stringify(value));
};

/** Dice coefficient over leaf-value multisets: 2·|A∩B| / (|A|+|B|). Graded —
 * a list sharing 2 of 3 entries or a filled-in empty field still scores high,
 * unlike per-field binary comparison. */
const itemSimilarity = (a: unknown, b: unknown): number => {
  const aLeaves: string[] = [];
  const bLeaves: string[] = [];
  collectLeaves(a, aLeaves);
  collectLeaves(b, bLeaves);
  if (aLeaves.length === 0 || bLeaves.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const leaf of aLeaves) counts.set(leaf, (counts.get(leaf) ?? 0) + 1);
  let shared = 0;
  for (const leaf of bLeaves) {
    const count = counts.get(leaf) ?? 0;
    if (count > 0) {
      counts.set(leaf, count - 1);
      shared++;
    }
  }
  return (2 * shared) / (aLeaves.length + bLeaves.length);
};

/** Looser than GitHub's 0.5 rename detection — CMS edits often rewrite most
 * of a small item, and pairing as "changed" reads better than add+remove. */
const SIMILARITY_THRESHOLD = 0.3;

/**
 * Identity-based item diff shared by object list fields and whole-file array
 * collections. Items must be pre-normalized (normalizeItem / initializeState).
 * Produces: per-field rows for edited items (keyed by the NEW index so editor
 * badges line up with the rendered form), one row per added item at its new
 * index, removed items under a non-numeric `removed` segment (never collides
 * with rendered paths), and a single "Order" note for a pure reorder.
 */
const diffArrayItems = (
  itemFields: Field[],
  oldItems: Record<string, unknown>[],
  newItems: Record<string, unknown>[],
  basePath: string,
  labelPrefix: string,
  rows: EntryDiffRow[]
) => {
  const before = rows.length;
  const primary = primaryFieldName(itemFields);

  // Pass 1 — key match. FIFO buckets so duplicate keys still pair in order.
  const oldByKey = new Map<
    string,
    { item: Record<string, unknown>; index: number }[]
  >();
  oldItems.forEach((item, index) => {
    const key = itemKey(item, primary);
    const bucket = oldByKey.get(key);
    const entry = { item, index };
    if (bucket) bucket.push(entry);
    else oldByKey.set(key, [entry]);
  });

  const emitChanged = (
    oldItem: Record<string, unknown>,
    newItem: Record<string, unknown>,
    newIndex: number
  ) => {
    const label = itemSummary(newItem, primary);
    const sub: EntryDiffRow[] = [];
    diffObjectFields(itemFields, oldItem, newItem, "", "", sub);
    for (const row of sub) {
      rows.push({
        ...row,
        fieldPath: `${basePath}.${newIndex}.${row.fieldPath}`,
        label: labelPrefix
          ? `${labelPrefix} › ${label} › ${row.label}`
          : `${label} › ${row.label}`,
      });
    }
  };

  const unmatchedNew: { item: Record<string, unknown>; index: number }[] = [];
  newItems.forEach((newItem, i) => {
    const bucket = oldByKey.get(itemKey(newItem, primary));
    const matched = bucket?.shift();
    if (!matched) {
      unmatchedNew.push({ item: newItem, index: i });
      return;
    }
    if (isEqual(matched.item, newItem)) return;
    emitChanged(matched.item, newItem, i);
  });
  const unmatchedOld: { item: Record<string, unknown>; index: number }[] = [];
  for (const bucket of oldByKey.values()) {
    for (const entry of bucket) unmatchedOld.push(entry);
  }
  unmatchedOld.sort((a, b) => a.index - b.index);

  // Pass 2 — similarity pairing: an edited item (identity field changed, list
  // partially rewritten, empty field filled in…) should diff as "changed",
  // not remove + add. Score every leftover pair by leaf-content overlap and
  // assign globally — best score first, position affinity breaks ties — so
  // two edited items can't steal each other's original.
  const candidates: { newIdx: number; oldIdx: number; score: number }[] = [];
  unmatchedNew.forEach((candidate, newIdx) => {
    unmatchedOld.forEach((old, oldIdx) => {
      const score = itemSimilarity(old.item, candidate.item);
      if (score >= SIMILARITY_THRESHOLD)
        candidates.push({ newIdx, oldIdx, score });
    });
  });
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aDistance = Math.abs(
      unmatchedNew[a.newIdx]!.index - unmatchedOld[a.oldIdx]!.index
    );
    const bDistance = Math.abs(
      unmatchedNew[b.newIdx]!.index - unmatchedOld[b.oldIdx]!.index
    );
    return aDistance - bDistance;
  });
  const usedNew = new Set<number>();
  const usedOld = new Set<number>();
  for (const pair of candidates) {
    if (usedNew.has(pair.newIdx) || usedOld.has(pair.oldIdx)) continue;
    usedNew.add(pair.newIdx);
    usedOld.add(pair.oldIdx);
    emitChanged(
      unmatchedOld[pair.oldIdx]!.item,
      unmatchedNew[pair.newIdx]!.item,
      unmatchedNew[pair.newIdx]!.index
    );
  }

  // Pass 3 — true leftovers.
  const withPrefix = (label: string) =>
    labelPrefix ? `${labelPrefix} › ${label}` : label;
  unmatchedNew.forEach((candidate, newIdx) => {
    if (usedNew.has(newIdx)) return;
    pushRow(
      rows,
      `${basePath}.${candidate.index}`,
      withPrefix("New item"),
      undefined,
      candidate.item
    );
  });
  let removedIndex = 0;
  unmatchedOld.forEach((old, oldIdx) => {
    if (usedOld.has(oldIdx)) return;
    pushRow(
      rows,
      `${basePath}.removed.${removedIndex++}`,
      withPrefix("Removed item"),
      old.item,
      undefined
    );
  });

  // Pass 4 — same items, different order → a single note instead of nothing.
  if (rows.length === before && !isEqual(oldItems, newItems)) {
    pushRow(
      rows,
      `${basePath}.order`,
      withPrefix("Order"),
      "(previous order)",
      `Reordered ${newItems.length} item${newItems.length === 1 ? "" : "s"}`
    );
  }
};

/**
 * Item-level diff for an array collection (the whole collection is one JSON
 * array file). Both sides are normalized against the inferred item fields
 * before matching, so upstream key-order / default differences never read as
 * a remove + add of the same logical item.
 */
export const computeArrayCollectionDiff = (
  itemFields: Field[],
  oldArray: unknown[],
  newArray: unknown[]
): EntryDiffRow[] => {
  const oldItems = oldArray.map((item) => normalizeItem(itemFields, item));
  const newItems = newArray.map((item) => normalizeItem(itemFields, item));
  const rows: EntryDiffRow[] = [];
  diffArrayItems(itemFields, oldItems, newItems, "items", "", rows);
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
