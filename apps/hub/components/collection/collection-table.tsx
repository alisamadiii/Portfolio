"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ExpandedState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
  RowData,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  CircleMinus,
  CirclePlus,
  Folder,
  FolderOpen,
  GripVertical,
  Loader,
} from "@/components/icon";

import { Button } from "@workspace/ui/components/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@workspace/ui/components/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
  }
}

export type TableData = {
  name: string;
  path: string;
  sha?: string;
  content?: string;
  object?: Record<string, any>;
  type: "file" | "dir";
  isNode?: boolean;
  parentPath?: string;
  subRows?: TableData[];
  fields?: Record<string, any>;
};

// Lets the drag-handle cell know whether dragging is currently allowed without
// threading state through the column definitions.
const ReorderStateContext = createContext<{ active: boolean }>({
  active: false,
});

// Same-id useSortable in the handle and the row is the standard TanStack ×
// dnd-kit row-DnD pattern: the row gets the node ref, the handle the listeners.
const RowDragHandle = ({ path }: { path: string }) => {
  const { active } = useContext(ReorderStateContext);
  const { attributes, listeners } = useSortable({
    id: path,
    disabled: !active,
  });

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn(
        "text-muted-foreground h-8 w-6",
        active
          ? "hover:text-foreground cursor-move"
          : "cursor-default opacity-30"
      )}
      title={
        active ? "Drag to reorder" : "Clear search and sort by order to drag"
      }
      {...attributes}
      {...listeners}
    >
      <GripVertical />
    </Button>
  );
};

function DraggableRow({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={isDragging ? "relative z-50 opacity-50" : undefined}
    >
      {children}
    </TableRow>
  );
}

const LShapeIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M4 4V11C4 12.0609 4.42143 13.0783 5.17157 13.8284C5.92172 14.5786 6.93913 15 8 15H20"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function CollectionTable<TData extends TableData>({
  columns,
  data,
  initialState,
  search,
  setSearch,
  onExpand,
  pathname,
  onNavigateFolder,
  path,
  isTree = false,
  primaryField,
  orderField,
  onReorder,
  reorderDisabled = false,
}: {
  columns: any[];
  data: Record<string, any>[];
  initialState?: Record<string, any>;
  search: string;
  setSearch: (value: string) => void;
  onExpand: (row: any) => Promise<any>;
  pathname: string;
  /** Embedded mode: folder rows call this instead of ?path= links. */
  onNavigateFolder?: (path: string) => void;
  path: string;
  isTree?: boolean;
  primaryField?: string;
  orderField?: string;
  onReorder?: (orderedPaths: string[]) => void;
  reorderDisabled?: boolean;
}) {
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const dndEnabled = !!orderField && !isTree;

  const [loadingRows, setLoadingRows] = useState<Record<string, boolean>>({});
  const loadingPathSetRef = useRef<Set<string>>(new Set());

  const handleRowExpansion = useCallback(
    async (row: Row<TData>) => {
      const needsLoading =
        row.getCanExpand() &&
        !row.getIsExpanded() &&
        row.original.subRows === undefined;
      const loadPath = row.original.isNode
        ? row.original.parentPath
        : row.original.path;

      if (needsLoading) {
        if (!loadPath) return;
        if (loadingPathSetRef.current.has(loadPath)) return;

        loadingPathSetRef.current.add(loadPath);
        setLoadingRows((prev) => ({ ...prev, [row.id]: true }));
        try {
          await onExpand(row.original);
        } catch (error) {
          console.error("onExpand failed for row:", row.id, error);
          setLoadingRows((prev) => {
            const newState = { ...prev };
            delete newState[row.id];
            return newState;
          });
          return;
        } finally {
          loadingPathSetRef.current.delete(loadPath);
          setLoadingRows((prev) => {
            const newState = { ...prev };
            delete newState[row.id];
            return newState;
          });
        }
      }
      row.toggleExpanded();
    },
    [onExpand]
  );

  const effectiveColumns = useMemo(() => {
    if (!dndEnabled) return columns;
    return [
      {
        id: "drag",
        header: () => null,
        enableSorting: false,
        meta: { className: "w-8" },
        cell: ({ row }: { row: any }) =>
          row.original.type === "file" ? (
            <RowDragHandle path={row.original.path} />
          ) : null,
      },
      ...columns,
    ];
  }, [columns, dndEnabled]);

  const table = useReactTable({
    data,
    columns: effectiveColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState,
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: (row) =>
      row.original.isNode || row.original.type === "dir",
    getSubRows: (row) => row.subRows,
    state: {
      globalFilter: search,
      expanded,
    },
    onGlobalFilterChange: setSearch,
    onExpandedChange: setExpanded,
  });

  const currentPage = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();

  const sorting = table.getState().sorting;
  const reorderActive =
    dndEnabled &&
    !reorderDisabled &&
    search === "" &&
    sorting.length === 1 &&
    sorting[0].id === orderField &&
    !sorting[0].desc;

  const filePaths = dndEnabled
    ? table
        .getRowModel()
        .rows.filter((row) => row.original.type === "file")
        .map((row) => row.original.path)
    : [];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = filePaths.indexOf(String(active.id));
      const newIndex = filePaths.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;

      onReorder?.(arrayMove(filePaths, oldIndex, newIndex));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filePaths.join("\n"), onReorder]
  );

  const paginationItems = (() => {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, i) => i);
    }

    const pages = new Set<number>([0, pageCount - 1, currentPage]);
    if (currentPage - 1 >= 0) pages.add(currentPage - 1);
    if (currentPage + 1 < pageCount) pages.add(currentPage + 1);

    const ordered = Array.from(pages).sort((a, b) => a - b);
    const items: Array<number | "ellipsis"> = [];

    for (let i = 0; i < ordered.length; i += 1) {
      if (i > 0 && ordered[i] - ordered[i - 1] > 1) {
        items.push("ellipsis");
      }
      items.push(ordered[i]);
    }

    return items;
  })();

  useEffect(() => {
    if (!isTree) return;

    table.getRowModel().rows.forEach((row) => {
      if (
        !row.getIsExpanded() &&
        ((row.original.isNode &&
          row.original.parentPath &&
          path.startsWith(row.original.parentPath)) ||
          (row.original.type === "dir" && path.startsWith(row.original.path)))
      ) {
        handleRowExpansion(row as Row<TData>);
      }
    });
  }, [isTree, path, handleRowExpansion, table, data]);

  return (
    <ReorderStateContext.Provider value={{ active: reorderActive }}>
    <DndContext
      sensors={sensors}
      modifiers={[restrictToVerticalAxis]}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
    <div className="space-y-4">
      {/* No overflow-hidden: it would break the sticky header row. Corners are
          rounded on the header/last-row cells instead. */}
      <div className="bg-background rounded-xl border shadow-xs">
        <Table className="border-separate border-spacing-0 text-sm">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="hover:bg-transparent sticky -top-4 z-20 md:-top-6"
            >
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "bg-muted first:rounded-tl-xl last:rounded-tr-xl h-10 cursor-pointer truncate border-b p-2 select-none last:cursor-default",
                      header.column.columnDef.meta?.className
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                    title={
                      header.column.getCanSort()
                        ? header.column.getNextSortingOrder() === "asc"
                          ? "Sort ascending"
                          : header.column.getNextSortingOrder() === "desc"
                            ? "Sort descending"
                            : "Clear sort"
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-x-2">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {{
                        asc: <ArrowUp className="h-4 w-4 opacity-50" />,
                        desc: <ArrowDown className="xh-4 w-4 opacity-50" />,
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className="[&>tr:last-child>td]:border-b-0 [&>tr:last-child>td:first-child]:rounded-bl-xl [&>tr:last-child>td:last-child]:rounded-br-xl">
          <SortableContext
            items={filePaths}
            strategy={verticalListSortingStrategy}
          >
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const rowCells =
                row.original.type === "dir" ? (
                  <>
                    <TableCell
                      colSpan={table.getVisibleLeafColumns().length - 1}
                      className="h-12 border-b p-2 py-0"
                      style={{
                        paddingLeft:
                          row.depth > 0 ? `${row.depth * 2}rem` : undefined,
                      }}
                    >
                      {isTree ? (
                        <button
                          className="flex items-center gap-x-2 font-medium"
                          onClick={() => handleRowExpansion(row as Row<TData>)}
                        >
                          {loadingRows[row.id] ? (
                            <Loader className="text-muted-foreground h-4 w-4 animate-spin" />
                          ) : row.getIsExpanded() ? (
                            <FolderOpen className="h-4 w-4" />
                          ) : (
                            <Folder className="h-4 w-4" />
                          )}
                          {row.original.name}
                        </button>
                      ) : onNavigateFolder ? (
                        <button
                          type="button"
                          className="flex items-center gap-x-2 font-medium"
                          onClick={() => onNavigateFolder(row.original.path)}
                        >
                          <Folder className="h-4 w-4" />
                          {row.original.name}
                        </button>
                      ) : (
                        <Link
                          className="flex items-center gap-x-2 font-medium"
                          href={`${pathname}?path=${encodeURIComponent(row.original.path)}`}
                        >
                          <Folder className="h-4 w-4" />
                          {row.original.name}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="h-12 border-b p-2 py-0">
                      {(() => {
                        const lastCell =
                          row.getVisibleCells()[
                            row.getVisibleCells().length - 1
                          ];
                        return flexRender(
                          lastCell.column.columnDef.cell,
                          lastCell.getContext()
                        );
                      })()}
                    </TableCell>
                  </>
                ) : (
                  row.getVisibleCells().map((cell, index) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "h-12 border-b p-2 py-0",
                        cell.column.columnDef.meta?.className
                      )}
                      style={{
                        paddingLeft:
                          cell.column.id === primaryField && row.depth > 0
                            ? `${row.depth * 1.5}rem`
                            : undefined,
                      }}
                    >
                      <div className="flex items-center gap-x-1">
                        {row.depth > 0 && cell.column.id === primaryField && (
                          <LShapeIcon className="text-muted-foreground h-4 w-4 opacity-50" />
                        )}
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                        {isTree &&
                          row.getCanExpand() &&
                          cell.column.id === primaryField &&
                          (loadingRows[row.id] ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="h-6 w-6 rounded-full"
                              disabled
                            >
                              <Loader className="text-muted-foreground h-4 w-4 animate-spin" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="h-6 w-6 rounded-full"
                              onClick={() =>
                                handleRowExpansion(row as Row<TData>)
                              }
                              disabled={
                                row.getIsExpanded() &&
                                Array.isArray(row.original.subRows) &&
                                row.original.subRows.length === 0
                              }
                            >
                              {row.getIsExpanded() ? (
                                <CircleMinus className="text-muted-foreground hover:text-foreground h-4 w-4" />
                              ) : (
                                <CirclePlus className="text-muted-foreground hover:text-foreground h-4 w-4" />
                              )}
                              <span className="sr-only">
                                {row.getIsExpanded()
                                  ? "Collapse row"
                                  : "Expand row"}
                              </span>
                            </Button>
                          ))}
                      </div>
                    </TableCell>
                  ))
                );

              return dndEnabled && row.original.type === "file" ? (
                <DraggableRow
                  key={row.id}
                  id={row.original.path}
                  disabled={!reorderActive}
                >
                  {rowCells}
                </DraggableRow>
              ) : (
                <TableRow key={row.id}>{rowCells}</TableRow>
              );
            })
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={table.getVisibleLeafColumns().length}
                className="text-muted-foreground p-6 text-center text-sm"
              >
                <span>No entries</span>
              </TableCell>
            </TableRow>
          )}
          </SortableContext>
        </TableBody>
        </Table>
      </div>
      {pageCount > 1 && (
        <footer className="flex items-center justify-end">
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  iconOnly
                  onClick={(event) => {
                    event.preventDefault();
                    if (table.getCanPreviousPage()) table.previousPage();
                  }}
                  className={
                    !table.getCanPreviousPage()
                      ? "pointer-events-none opacity-50"
                      : undefined
                  }
                />
              </PaginationItem>
              {paginationItems.map((item, index) => (
                <PaginationItem key={`${item}-${index}`}>
                  {item === "ellipsis" ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      href="#"
                      isActive={item === currentPage}
                      onClick={(event) => {
                        event.preventDefault();
                        table.setPageIndex(item);
                      }}
                    >
                      {item + 1}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  iconOnly
                  onClick={(event) => {
                    event.preventDefault();
                    if (table.getCanNextPage()) table.nextPage();
                  }}
                  className={
                    !table.getCanNextPage()
                      ? "pointer-events-none opacity-50"
                      : undefined
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </footer>
      )}
    </div>
    </DndContext>
    </ReorderStateContext.Provider>
  );
}
