import type { ManifestCollection } from "@/lib/engine/collections";
import { labelize } from "@/lib/engine/infer";

/**
 * Shared table pieces for the v2 collection views. CollectionV2 (Markdown
 * files) and ArrayCollection (single JSON array) save differently but render
 * the SAME table: sticky uppercase header + grid rows showing the first three
 * declared fields as columns. The grid template is inline style so header and
 * rows always align regardless of column count.
 */

export type ColumnDef = { key: string; label: string; type: string };

const COLUMN_SKIP = new Set(["body", "seo"]);
// Keys that make the best first (primary) column, in preference order.
const PRIMARY_KEYS = ["title", "name", "label", "slug"];

const scalarType = (value: unknown): string => {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  return "string";
};

/**
 * Columns for a discovered collection (no declared fields): the first few
 * SCALAR top-level keys of a representative entry, a title/name-ish key first.
 * Arrays/objects never earn a column.
 */
function deriveColumns(sample: Record<string, unknown>): ColumnDef[] {
  const scalarKeys = Object.keys(sample).filter(
    (key) =>
      !COLUMN_SKIP.has(key) &&
      sample[key] !== null &&
      typeof sample[key] !== "object"
  );
  scalarKeys.sort((a, b) => {
    const ai = PRIMARY_KEYS.indexOf(a);
    const bi = PRIMARY_KEYS.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  return scalarKeys.slice(0, 3).map((key) => ({
    key,
    label: labelize(key),
    type: scalarType(sample[key]),
  }));
}

/**
 * First 3 declared fields (the synthetic `body` never earns a column). When the
 * collection has no declared fields (discovered), derive columns from a sample
 * entry instead.
 */
export function buildColumns(
  collection: ManifestCollection,
  sample?: Record<string, unknown> | null
): ColumnDef[] {
  if (collection.fields.length > 0) {
    return collection.fields
      .filter((field) => field.name !== "body")
      .slice(0, 3)
      .map((field) => ({
        key: field.name,
        label: field.label ?? labelize(field.name),
        type: field.type,
      }));
  }
  return sample ? deriveColumns(sample) : [];
}

/** First column flexes, the rest are fixed; `trailing` is the Status/actions slot. */
export function gridTemplate(columns: ColumnDef[], trailing: string): string {
  return [
    ...columns.map((_, index) => (index === 0 ? "minmax(0,1fr)" : "140px")),
    trailing,
  ].join(" ");
}

export function CollectionTableHeader({
  columns,
  template,
  trailingLabel,
}: {
  columns: ColumnDef[];
  template: string;
  trailingLabel?: string;
}) {
  return (
    <div
      className="text-muted-foreground bg-card sticky top-0 z-[2] grid items-center gap-4 border-b px-2.5 py-2.5 text-[10.5px] font-bold tracking-[0.07em] uppercase"
      style={{ gridTemplateColumns: template }}
    >
      {columns.map((column) => (
        <span key={column.key} className="truncate">
          {column.label}
        </span>
      ))}
      <span>{trailingLabel ?? ""}</span>
    </div>
  );
}

/** Primary-cell helper: blank values fall back to a derived label. */
export function withFallback(value: unknown, fallback: string): unknown {
  if (value == null) return fallback;
  if (typeof value === "string" && !value.trim()) return fallback;
  return value;
}

export function cellText(column: ColumnDef, value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "—";
  if (Array.isArray(value))
    return `${value.length} ${value.length === 1 ? "item" : "items"}`;
  if (column.type === "image" && typeof value === "string")
    return value.split("/").pop() || value;
  if (typeof value === "object") return "…";
  return String(value);
}

export function CollectionCell({
  column,
  value,
  primary,
}: {
  column: ColumnDef;
  value: unknown;
  primary?: boolean;
}) {
  return (
    <span
      className={
        primary
          ? "truncate text-[12.5px] font-semibold"
          : "text-muted-foreground truncate text-[12px]"
      }
    >
      {cellText(column, value)}
    </span>
  );
}
