import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

export type Column<T> = {
  key: string;
  header: ReactNode;
  width?: string;
  cell: (row: T) => ReactNode;
  align?: "end";
};

/**
 * Grid-based table: header 38px on sidebar tint, rows 60–64px with divider lines, row hover = sidebar tint.
 * Wrapped in an overflow-x box so it scrolls on phones instead of squashing.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  minWidth = 640,
  onRowClick,
  rowHref,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  minWidth?: number;
  onRowClick?: (row: T) => void;
  /** When set, the whole row is a link (rendered as an <a>). */
  rowHref?: (row: T) => string;
}) {
  const template = columns.map((c) => c.width ?? "1fr").join(" ");
  const rowClass =
    "grid min-h-[60px] items-center border-b border-divider px-6 last:border-b-0 hover:bg-sidebar";
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth }}>
        <div
          className="grid h-[38px] items-center border-b border-divider bg-sidebar px-6 text-xs font-medium text-dim"
          style={{ gridTemplateColumns: template }}
        >
          {columns.map((c) => (
            <span key={c.key} className={cn(c.align === "end" && "text-right")}>
              {c.header}
            </span>
          ))}
        </div>
        {rows.length === 0 && empty}
        {rows.map((r) => {
          const cells = columns.map((c) => (
            <div
              key={c.key}
              className={cn("min-w-0 text-[13px] text-ink-3", c.align === "end" && "flex justify-end")}
            >
              {c.cell(r)}
            </div>
          ));
          if (rowHref) {
            return (
              <a
                key={rowKey(r)}
                href={rowHref(r)}
                className={cn(rowClass, "text-inherit no-underline")}
                style={{ gridTemplateColumns: template }}
              >
                {cells}
              </a>
            );
          }
          return (
            <div
              key={rowKey(r)}
              className={cn(rowClass, onRowClick && "cursor-pointer")}
              style={{ gridTemplateColumns: template }}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
            >
              {cells}
            </div>
          );
        })}
      </div>
    </div>
  );
}
