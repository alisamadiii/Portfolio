"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  Row,
  Table as TableType,
  useReactTable,
} from "@tanstack/react-table";
import { TRPCClientErrorBase } from "@trpc/client";
import { DefaultErrorShape } from "@trpc/server/unstable-core-do-not-import";

import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import { cn } from "../lib/utils";

type DataTableProps<TData, TValue> = {
  isLoading?: boolean | number;
  error?: TRPCClientErrorBase<DefaultErrorShape> | null;
  className?: string;
} & (
  | {
      table: TableType<TData>;
      onRowClick?: (row: Row<TData>) => void;
    }
  | {
      columns: ColumnDef<TData, TValue>[];
      data: TData[];
      onRowClick?: (row: Row<TData>) => void;
    }
);

export function DataTable<TData, TValue>(props: DataTableProps<TData, TValue>) {
  const tableConfig =
    "table" in props
      ? props.table
      : // eslint-disable-next-line react-hooks/rules-of-hooks
        useReactTable({
          data: props.data,
          columns: props.columns,
          getCoreRowModel: getCoreRowModel(),
        });

  const { onRowClick, className, error } = props;

  return (
    <div
      className={cn(
        "shadow-card isolate overflow-hidden rounded-3xl",
        className
      )}
    >
      <Table>
        <TableHeader>
          {tableConfig.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-muted border-b-0">
              {headerGroup.headers.map((header, index) => {
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "h-14",
                      index === 0 && "pl-8",
                      index === headerGroup.headers.length - 1 && "pr-8"
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {props.isLoading ? (
            Array.from({
              length: typeof props.isLoading === "number" ? props.isLoading : 4,
            }).map((_, index) => (
              <TableRow key={index}>
                <TableCell
                  className="h-16 px-4"
                  colSpan={tableConfig.getAllColumns().length}
                >
                  <Skeleton className="h-full w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : tableConfig.getRowModel().rows?.length ? (
            tableConfig.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={cn(
                  "h-16",
                  onRowClick
                    ? "hover:bg-muted/50 cursor-pointer transition-colors"
                    : ""
                )}
                onClick={() => onRowClick?.(row)}
              >
                {row.getVisibleCells().map((cell, index) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "px-4",
                      index === 0 && "pl-8",
                      index === row.getVisibleCells().length - 1 && "pr-8"
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={
                  "columns" in props
                    ? props.columns.length
                    : tableConfig.getAllColumns().length
                }
                className="text-muted-foreground h-24 text-center"
              >
                {error ? error.message : "No results"}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
