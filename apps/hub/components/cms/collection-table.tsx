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

/** First 3 declared fields (the synthetic `body` never earns a column). */
export function buildColumns(collection: ManifestCollection): ColumnDef[] {
  return collection.fields
    .filter((field) => field.name !== "body")
    .slice(0, 3)
    .map((field) => ({
      key: field.name,
      label: field.label ?? labelize(field.name),
      type: field.type,
    }));
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
