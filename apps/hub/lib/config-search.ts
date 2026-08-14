import type { Field } from "@/types/field";

/**
 * Config-driven field search for the command palette. The index is built
 * entirely from `.pages.yml` (field labels, section names, page names) — no
 * content fetching. Matches deep-link into the entry editor via `?focus=`.
 */

export type FieldSearchItem = {
  schemaName: string;
  schemaLabel: string;
  schemaType: "file" | "collection";
  /** Structural RHF-style path without list indices, e.g. "seo.title". */
  fieldPath: string;
  label: string;
  breadcrumb: string[];
};

const fieldLabel = (field: Field) =>
  field.label === false ? field.name : field.label || field.name;

const walkFields = (
  fields: Field[] | undefined,
  schema: { name: string; label: string; type: "file" | "collection" },
  parentPath: string,
  breadcrumb: string[],
  items: FieldSearchItem[]
) => {
  if (!fields) return;
  for (const field of fields) {
    if (field.hidden) continue;
    const path = parentPath ? `${parentPath}.${field.name}` : field.name;
    const label = fieldLabel(field);
    items.push({
      schemaName: schema.name,
      schemaLabel: schema.label,
      schemaType: schema.type,
      fieldPath: path,
      label,
      breadcrumb,
    });
    const childCrumb = [...breadcrumb, label];
    walkFields(field.fields, schema, path, childCrumb, items);
    walkFields(field.blocks, schema, path, childCrumb, items);
  }
};

export const buildFieldSearchIndex = (
  configObject: Record<string, any> | undefined | null
): FieldSearchItem[] => {
  const content: any[] = Array.isArray(configObject?.content)
    ? configObject.content
    : [];
  const items: FieldSearchItem[] = [];
  for (const schema of content) {
    if (schema.type !== "file" && schema.type !== "collection") continue;
    walkFields(
      schema.fields,
      {
        name: schema.name,
        label: schema.label || schema.name,
        type: schema.type,
      },
      "",
      [schema.label || schema.name],
      items
    );
  }
  return items;
};

export const filterFieldIndex = (
  items: FieldSearchItem[],
  query: string,
  limit = 15
): FieldSearchItem[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored: Array<{ item: FieldSearchItem; score: number }> = [];
  for (const item of items) {
    const label = item.label.toLowerCase();
    const crumb = item.breadcrumb.join(" ").toLowerCase();
    let score: number;
    if (label.startsWith(q)) score = 0;
    else if (label.includes(q)) score = 1;
    else if (crumb.includes(q)) score = 2;
    else continue;
    scored.push({ item, score });
  }
  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((entry) => entry.item);
};
