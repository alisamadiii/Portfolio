"use client";

import { cn } from "@workspace/ui/lib/utils";
import { DataTable } from "@workspace/ui/custom/data-table";

type AdminDataTableProps<TData, TValue> = React.ComponentProps<
  typeof DataTable<TData, TValue>
> & {
  /** Rendered flush under the table as a hairline pagination/summary bar */
  footer?: React.ReactNode;
};

/**
 * Ops-console treatment of the shared DataTable: smaller radius, dense
 * h-11 rows, optional footer bar that reads as part of the table.
 * The shared component stays untouched — overrides win via tailwind-merge.
 */
export function AdminDataTable<TData, TValue>({
  footer,
  className,
  rowClassName,
  ...props
}: AdminDataTableProps<TData, TValue>) {
  return (
    <div>
      <DataTable
        {...props}
        className={cn("rounded-lg", footer && "rounded-b-none", className)}
        rowClassName={(row) => cn("h-11", rowClassName?.(row))}
      />
      {footer && (
        <div className="text-muted-foreground flex items-center justify-between rounded-b-lg border border-t-0 px-3 py-2 text-xs">
          {footer}
        </div>
      )}
    </div>
  );
}
