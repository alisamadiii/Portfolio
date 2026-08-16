import { getPrimaryField, safeAccess } from "@workspace/cms-core/schema";

/**
 * Collection entries hide their `seo` section in the form — instead the
 * seo.title / seo.description are derived at draft-save time from the entry's
 * own fields (title + excerpt/description). Only blank seo values are filled;
 * hand-written SEO is never overwritten.
 */

const DESCRIPTION_SOURCES = ["excerpt", "description", "summary"];

function isBlank(value: unknown): boolean {
  return (
    value == null || (typeof value === "string" && value.trim() === "")
  );
}

function nonBlankString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function fillOne(
  schema: Record<string, any>,
  seoField: Record<string, any>,
  values: Record<string, unknown>
): Record<string, unknown> {
  const seo = (values.seo ?? {}) as Record<string, unknown>;
  const declared = new Set(
    (Array.isArray(seoField.fields) ? seoField.fields : [])
      .map((field: any) => field?.name)
      .filter((name: unknown): name is string => typeof name === "string")
  );

  const fills: Record<string, unknown> = {};

  if (declared.has("title") && isBlank(seo.title)) {
    const primaryField = getPrimaryField(schema);
    const title = primaryField
      ? nonBlankString(safeAccess(values, primaryField))
      : undefined;
    if (title) fills.title = title;
  }

  if (declared.has("description") && isBlank(seo.description)) {
    for (const source of DESCRIPTION_SOURCES) {
      const description = nonBlankString(values[source]);
      if (description) {
        fills.description = description;
        break;
      }
    }
  }

  if (Object.keys(fills).length === 0) return values;
  return { ...values, seo: { ...seo, ...fills } };
}

/**
 * Fill blank seo.title / seo.description from the entry's content fields.
 * No-op unless `schema` is a collection with a top-level `seo` object field.
 * Handles list collections (array values) by filling each item.
 */
export function applySeoAutofill<
  T extends Record<string, unknown> | Record<string, unknown>[],
>(schema: Record<string, any> | null | undefined, values: T): T {
  if (!schema || schema.type !== "collection") return values;
  const seoField = (Array.isArray(schema.fields) ? schema.fields : []).find(
    (field: any) => field?.name === "seo" && field?.type === "object"
  );
  if (!seoField) return values;

  if (Array.isArray(values)) {
    return values.map((item) =>
      item && typeof item === "object"
        ? fillOne(schema, seoField, item as Record<string, unknown>)
        : item
    ) as T;
  }
  return fillOne(schema, seoField, values as Record<string, unknown>) as T;
}

/** Recursively drop `required` — a hidden field must never block validation. */
function stripRequired(field: Record<string, any>): Record<string, any> {
  return {
    ...field,
    required: false,
    ...(Array.isArray(field.fields)
      ? { fields: field.fields.map(stripRequired) }
      : {}),
  };
}

/**
 * Mark the top-level `seo` object field hidden on a collection's field list —
 * the form skips hidden fields but their values still round-trip on save.
 * `required` is stripped inside seo (configs often mark seo.title required;
 * a hidden required field would block submit with an invisible error).
 * Returns the fields untouched for non-collections.
 */
export function hideSeoFields(
  schema: Record<string, any> | null | undefined,
  fields: any[]
): any[] {
  if (!schema || schema.type !== "collection") return fields;
  return fields.map((field) =>
    field?.name === "seo" && field?.type === "object"
      ? { ...stripRequired(field), hidden: true }
      : field
  );
}
