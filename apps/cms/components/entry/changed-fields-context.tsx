"use client";

import { createContext, useContext } from "react";

/**
 * Per-field draft change indicators. Entry computes a field-level diff
 * between the published content and the restored draft, keyed by RHF field
 * path (e.g. "seo.title", "sections.2.heading"); the form reads it to frame
 * changed inputs in amber and show the previous published value below them.
 */

export type ChangedFieldsMap = Map<string, { old: unknown }>;

export type ChangedFieldMatch =
  { kind: "exact" | "ancestor"; old: unknown } | { kind: "descendant" };

const ChangedFieldsContext = createContext<ChangedFieldsMap | null>(null);

export const ChangedFieldsProvider = ChangedFieldsContext.Provider;

/**
 * Match a rendered field path against the changed-fields map. Exact match
 * first; then ancestor rows (a block diffed as a whole marks the leaves
 * inside it). `includeDescendants` covers leaf-less containers like scalar
 * lists whose diff rows are per index ("tags.0") and have no rendered label.
 */
export const useChangedField = (
  fieldPath: string,
  includeDescendants = false
): ChangedFieldMatch | null => {
  const map = useContext(ChangedFieldsContext);
  if (!map || map.size === 0) return null;

  const exact = map.get(fieldPath);
  if (exact) return { kind: "exact", old: exact.old };

  const segments = fieldPath.split(".");
  for (let i = segments.length - 1; i > 0; i--) {
    const ancestor = map.get(segments.slice(0, i).join("."));
    if (ancestor) return { kind: "ancestor", old: ancestor.old };
  }

  if (includeDescendants) {
    const prefix = `${fieldPath}.`;
    for (const key of map.keys()) {
      if (key.startsWith(prefix)) return { kind: "descendant" };
    }
  }

  return null;
};
