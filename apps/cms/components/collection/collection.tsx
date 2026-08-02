"use client";

import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useConfig } from "@/contexts/config-context";
import { viewComponents } from "@/fields/registry";
import { EllipsisVertical, FolderPlus, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

import { requireApiSuccess } from "@/lib/api-client";
import { invalidateUrlKeys } from "@/lib/query";
import { resolveContentOperations } from "@/lib/operations";
import {
  getFieldByPath,
  getPrimaryField,
  getSchemaByName,
  safeAccess,
} from "@/lib/schema";
import {
  getFileName,
  getParentPath,
  getRelativePath,
  joinPathSegments,
  normalizePath,
  sortFiles,
} from "@/lib/utils/file";

import { EmptyCreate } from "@/components/empty-create";
import { FileOptions } from "@/components/file/file-options";
import { FolderCreate } from "@/components/folder-create";
import { useRepoHeader } from "@/components/repo/repo-header-context";

import { CollectionTable } from "./collection-table";

type GroupTrailItem = {
  name: string;
  label?: string | null;
};

const CollectionHeaderActions = memo(function CollectionHeaderActions({
  addEntryHref,
  actionNode,
  collectionPath,
  name,
  showAddEntry,
  showFolderCreate,
  onFolderCreate,
  onSearchChange,
}: {
  addEntryHref: string;
  actionNode?: ReactNode;
  collectionPath: string;
  name: string;
  showAddEntry: boolean;
  showFolderCreate: boolean;
  onFolderCreate: (entry: any) => void;
  onSearchChange: (value: string) => void;
}) {
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => onSearchChange(searchInput), 200);
    return () => clearTimeout(timeout);
  }, [searchInput, onSearchChange]);

  return (
    <div className="flex items-center gap-x-2">
      {actionNode}
      <div className="relative hidden w-52 sm:block md:w-64">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-50" />
        <Input
          className="pl-9"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search entries..."
        />
      </div>
      {showFolderCreate && (
        <Tooltip>
          <TooltipTrigger
            render={
              <div>
                <FolderCreate
                  path={collectionPath}
                  type="content"
                  name={name}
                  onCreate={onFolderCreate}
                >
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    size="icon"
                  >
                    <FolderPlus />
                  </Button>
                </FolderCreate>
              </div>
            }
          />
          <TooltipContent>Create folder</TooltipContent>
        </Tooltip>
      )}
      {showAddEntry && (
        <>
          <Link
            className={cn(buttonVariants(), "hidden sm:flex")}
            href={addEntryHref}
          >
            Add an entry
          </Link>
          <Link
            className={cn(
              buttonVariants({ size: "icon" }),
              "shrink-0 sm:hidden"
            )}
            href={addEntryHref}
          >
            <Plus className="size-4" />
          </Link>
        </>
      )}
    </div>
  );
});

const withFieldValue = (
  fields: Record<string, any> | undefined,
  path: string,
  value: number
) => {
  const segments = path.split(".");
  const clone: Record<string, any> = { ...(fields ?? {}) };
  let cursor: Record<string, any> = clone;

  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    cursor[key] =
      cursor[key] != null &&
      typeof cursor[key] === "object" &&
      !Array.isArray(cursor[key])
        ? { ...cursor[key] }
        : {};
    cursor = cursor[key];
  }

  cursor[segments[segments.length - 1]] = value;
  return clone;
};

export function Collection({ name, path }: { name: string; path?: string }) {
  const [tableSearch, setTableSearch] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const queryClient = useQueryClient();

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const { config } = useConfig();
  if (!config) throw new Error(`Configuration not found.`);

  const schema = useMemo(
    () => getSchemaByName(config?.object, name),
    [config, name]
  );
  if (!schema) throw new Error(`Schema not found for "${name}".`);
  if (schema.type !== "collection")
    throw new Error(`"${name}" is not a collection.`);
  const operations = useMemo(
    () => resolveContentOperations({ schema }),
    [schema]
  );
  const canCreate = operations.create;
  const canRename = operations.rename;
  const canDelete = operations.delete;

  const viewFields = useMemo(() => {
    let pathAndFieldArray: any[] = [];
    if (schema.fields) {
      if (schema.view?.fields && schema.view?.fields.length > 0) {
        // If we have a list of fields defined for the view
        schema.view.fields.forEach((path: string) => {
          const field = getFieldByPath(schema.fields, path);
          if (field && !["object", "block"].includes(field.type))
            pathAndFieldArray.push({ path: path, field: field });
        });
      } else {
        pathAndFieldArray = schema.fields
          .filter(
            (field: any) =>
              !["object", "block"].includes(field.type) && !field.hidden
          )
          .map((field: any) => ({ path: field.name, field: field }));
      }
    } else {
      pathAndFieldArray.push({
        path: "name",
        field: {
          label: "Name",
          name: "name",
          type: "string",
        },
      });
    }

    // If the filename starts with {year}-{month}-{day} and date is listed in the
    // view fields and is not an actual field, or if there are no fields, we add a date field
    if (
      !pathAndFieldArray.find((item: any) => item.path === "date") &&
      schema.filename.startsWith("{year}-{month}-{day}") &&
      ((schema.view?.fields && schema.view?.fields.includes("date")) ||
        !schema.view?.fields)
    ) {
      pathAndFieldArray.push({
        path: "date",
        field: {
          label: "Date",
          name: "date",
          type: "date",
        },
      });
    }

    return pathAndFieldArray;
  }, [schema]);

  const primaryField = useMemo(
    () => getPrimaryField(schema) ?? "name",
    [schema]
  );

  // Manual ordering (drag-to-reorder): view.reorder names a number field that
  // stores each entry's position. Not supported for tree layouts.
  const orderField = useMemo(() => {
    const fieldName = schema.view?.reorder;
    if (!fieldName || typeof fieldName !== "string") return undefined;
    const field = getFieldByPath(schema.fields ?? [], fieldName);
    return field?.type === "number" ? fieldName : undefined;
  }, [schema]);
  const orderEnabled = !!orderField && schema.view?.layout !== "tree";

  const requestedFieldPaths = useMemo(() => {
    const paths = new Set<string>(["name", "path", primaryField]);
    viewFields.forEach((item: any) => paths.add(item.path));
    if (orderField) paths.add(orderField);
    return Array.from(paths);
  }, [primaryField, viewFields, orderField]);

  const handleTableSearchChange = useCallback((value: string) => {
    setTableSearch(value);
  }, []);

  const buildCollectionApiUrl = useCallback(
    (fetchPath: string): string => {
      const params = new URLSearchParams({
        path: fetchPath,
        fields: requestedFieldPaths.join(","),
      });
      return `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collections/${encodeURIComponent(name)}?${params.toString()}`;
    },
    [config.branch, config.owner, config.repo, name, requestedFieldPaths]
  );

  const fetchCollectionByUrl = useCallback(
    async (
      apiUrl: string,
      signal?: AbortSignal
    ): Promise<Record<string, any>[]> => {
      const response = await fetch(apiUrl, { signal });
      const result = await requireApiSuccess<any>(response, "Fetch failed");

      if (result.data.errors?.length) {
        result.data.errors.forEach((e: any) => toast.error(e));
      }

      const unsortedData = result.data.contents || [];
      if (unsortedData.length === 0) return [];
      return unsortedData.sort((a: any, b: any) => {
        if (a.type === "dir" && b.type === "file")
          return schema.view?.foldersFirst ? -1 : 1;
        if (a.type === "file" && b.type === "dir")
          return schema.view?.foldersFirst ? 1 : -1;
        return a.name.localeCompare(b.name);
      });
    },
    [schema.view?.foldersFirst]
  );

  const collectionPath =
    schema.view?.layout === "tree" ? schema.path : path || schema.path;
  const rootCollectionKey = useMemo(
    () => buildCollectionApiUrl(collectionPath),
    [buildCollectionApiUrl, collectionPath]
  );

  const collectionQuery = useQuery({
    queryKey: [rootCollectionKey],
    queryFn: ({ signal }) => fetchCollectionByUrl(rootCollectionKey, signal),
    staleTime: 2_000,
  });
  const data = collectionQuery.data ?? [];
  const error =
    localError ??
    (collectionQuery.error
      ? collectionQuery.error instanceof Error
        ? collectionQuery.error.message
        : "Fetch failed"
      : null);

  useEffect(() => {
    setLocalError(null);
  }, [rootCollectionKey]);

  const setCollectionData = useCallback(
    (
      updater: (prev: Record<string, any>[]) => Record<string, any>[]
    ) => {
      queryClient.setQueryData<Record<string, any>[]>(
        [rootCollectionKey],
        (prev) => updater(prev ?? [])
      );
    },
    [queryClient, rootCollectionKey]
  );

  const fetchCollectionData = useCallback(
    async (fetchPath: string): Promise<Record<string, any>[] | undefined> => {
      const apiUrl = buildCollectionApiUrl(fetchPath);
      try {
        // ensureQueryData returns cached rows regardless of staleness,
        // otherwise fetches and stores — the old "cache or fetch" behavior.
        return await queryClient.ensureQueryData({
          queryKey: [apiUrl],
          queryFn: ({ signal }) => fetchCollectionByUrl(apiUrl, signal),
          staleTime: Infinity,
        });
      } catch (err: any) {
        console.error(`Fetch failed for path ${fetchPath}:`, err);
        if (fetchPath === (path || schema.path)) {
          setLocalError(err.message);
        } else {
          toast.error(
            `Could not load items inside ${getFileName(fetchPath)}: ${err.message}`
          );
        }
        return undefined;
      }
    },
    [buildCollectionApiUrl, fetchCollectionByUrl, path, queryClient, schema.path]
  );

  const handleDelete = useCallback(
    (path: string) => {
      setCollectionData((prevData) =>
        prevData.filter((item: any) => item.path !== path)
      );
    },
    [setCollectionData]
  );

  const handleRename = useCallback(
    (path: string, newPath: string) => {
    setCollectionData((prevData: any) => {
      if (!prevData) return prevData;

      const updateNestedData = (items: any[]): any[] => {
        return items.map((item: any) => {
          // If this is the item being renamed
          if (item.path === path) {
            return { ...item, path: newPath, name: getFileName(newPath) };
          }

          // If this item has subRows, recursively update them
          if (item.subRows && Array.isArray(item.subRows)) {
            const updatedSubRows = updateNestedData(item.subRows);
            // Only create a new item reference if subRows changed
            if (updatedSubRows !== item.subRows) {
              return { ...item, subRows: updatedSubRows };
            }
          }

          // Return the original item if no changes
          return item;
        });
      };

      // Check if the item is moving to a different folder
      if (
        getParentPath(normalizePath(path)) !==
        getParentPath(normalizePath(newPath))
      ) {
        // For items moved to a different folder, we need to:
        // 1. Remove the item from its original location (recursively)
        const removeItem = (items: any[]): any[] => {
          return items
            .filter((item) => item.path !== path)
            .map((item) => {
              if (item.subRows && Array.isArray(item.subRows)) {
                const updatedSubRows = removeItem(item.subRows);
                if (updatedSubRows !== item.subRows) {
                  return { ...item, subRows: updatedSubRows };
                }
              }
              return item;
            });
        };

        return sortFiles(removeItem(prevData));
      }

      // For items renamed within the same folder, update the item
      return sortFiles(updateNestedData(prevData));
    });
    },
    [setCollectionData]
  );

  const handleFolderCreate = useCallback(
    (entry: any) => {
      const parentPath = getParentPath(entry.path);
      const parent = {
        type: "dir",
        name: getFileName(parentPath),
        path: parentPath,
        size: 0,
        url: null,
      };

      setCollectionData((prevData) => {
        if (!prevData) return [parent];
        return sortFiles([...prevData, parent]);
      });
    },
    [setCollectionData]
  );

  const handleConfirmRenameNode = useCallback(
    (path: string, newPath: string) => {
      try {
        const normalizedPath = normalizePath(path);
        const normalizedNewPath = normalizePath(newPath);

        const renamePromise = new Promise(async (resolve, reject) => {
          try {
            const response = await fetch(
              `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/files/${encodeURIComponent(normalizedPath)}/rename`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "content",
                  name,
                  newPath: normalizedNewPath,
                }),
              }
            );
            const data = await requireApiSuccess<any>(
              response,
              "Failed to rename file"
            );

            resolve(data);
          } catch (error) {
            reject(error);
          }
        });

        toast.promise(renamePromise, {
          loading: `Renaming "${path}" to "${newPath}"`,
          success: (data: any) => {
            router.push(
              `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}/new?parent=${encodeURIComponent(getParentPath(normalizedNewPath))}`
            );
            return data.message;
          },
          error: (error: any) => error.message,
        });
      } catch (error) {
        console.error(error);
      }
    },
    [config.owner, config.repo, config.branch, name, router]
  );

  const columns = useMemo(() => {
    let tableColumns: any;
    tableColumns =
      viewFields
        .map((pathAndField: any) => {
          const path = pathAndField.path;
          const field = pathAndField.field;
          if (!field) return null;

          return {
            id: path,
            accessorKey: path,
            accessorFn: (originalRow: any) =>
              safeAccess(originalRow.fields, path),
            header: field?.label ?? field.name,
            meta: {
              className:
                path === primaryField
                  ? "truncate w-full min-w-[12rem] max-w-[1px]"
                  : "",
            },
            cell: ({ cell, row }: { cell: any; row: any }) => {
              const cellValue = cell.getValue();
              const FieldComponent = viewComponents?.[field.type];
              const CellView = FieldComponent ? (
                <FieldComponent value={cellValue} field={field} />
              ) : Array.isArray(cellValue) ? (
                cellValue.join(", ")
              ) : (
                cellValue
              );
              if (path === primaryField) {
                return (
                  <Link
                    className="truncate font-medium"
                    href={`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}/edit/${encodeURIComponent(row.original.path)}`}
                  >
                    {CellView}
                  </Link>
                );
              }
              return (
                <div className="w-full max-w-[12rem] truncate">{CellView}</div>
              );
            },
            sortUndefined: schema.view?.foldersFirst ? "first" : "last",
          };
        })
        .filter(Boolean) || [];

    // Hidden sortable column for the manual-order field so the table can sort
    // by it even when it's not shown (visibility is off in initialState).
    if (
      orderEnabled &&
      orderField &&
      !viewFields.some((item: any) => item.path === orderField)
    ) {
      tableColumns.push({
        id: orderField,
        accessorKey: orderField,
        accessorFn: (originalRow: any) =>
          safeAccess(originalRow.fields, orderField),
        header: "Order",
        sortUndefined: "last",
      });
    }

    tableColumns.push({
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }: { row: any }) => (
        <div className="flex justify-end gap-1">
          {row.original.type === "file" && (
            <ButtonGroup>
              <Link
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" })
                )}
                href={`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${name}/edit/${encodeURIComponent(row.original.path)}`}
              >
                Edit
              </Link>
              <FileOptions
                path={row.original.path}
                sha={row.original.sha}
                type="collection"
                name={name}
                canDelete={canDelete}
                canRename={canRename}
                onDelete={handleDelete}
                onRename={handleRename}
              >
                <Button variant="outline" size="icon-sm">
                  <EllipsisVertical />
                </Button>
              </FileOptions>
            </ButtonGroup>
          )}
          {canCreate &&
            schema.view?.layout === "tree" &&
            (row.original.type === "file" &&
            !row.original.isNode &&
            !(
              row.depth === 0 &&
              row.original.name === schema.view?.node?.filename
            ) ? (
              canRename ? (
                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <AlertDialogTrigger
                          render={
                            <Button
                              variant="outline"
                              size="icon-sm"
                              className="h-8 w-8"
                            >
                              <Plus className="size-4" />
                            </Button>
                          }
                        />
                      }
                    />
                    <TooltipContent>Add children entry</TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Rename this file first?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Before adding children to this file, you must rename it
                        from &quot;{row.original.path}&quot; to &quot;
                        {row.original.path.replace(
                          `.${schema.extension}`,
                          `/${schema.view?.node?.filename}`
                        )}
                        &quot;.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          handleConfirmRenameNode(
                            row.original.path,
                            row.original.path.replace(
                              `.${schema.extension}`,
                              `/${schema.view?.node?.filename}`
                            )
                          )
                        }
                      >
                        Rename
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null
            ) : (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Link
                      className={cn(
                        buttonVariants({ variant: "outline", size: "icon-sm" }),
                        "h-8 w-8"
                      )}
                      href={
                        row.original.isNode
                          ? `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}/new?parent=${encodeURIComponent(row.original.parentPath)}`
                          : row.original.type === "dir"
                            ? `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}/new?parent=${encodeURIComponent(row.original.path)}`
                            : `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}/new?parent=${encodeURIComponent(row.original.path)}`
                      }
                    >
                      <Plus className="size-4" />
                    </Link>
                  }
                />
                <TooltipContent>Add children entry</TooltipContent>
              </Tooltip>
            ))}
        </div>
      ),
      enableSorting: false,
    });

    return tableColumns;
  }, [
    config.owner,
    config.repo,
    config.branch,
    name,
    viewFields,
    primaryField,
    handleDelete,
    handleRename,
    schema.view?.foldersFirst,
    schema.view?.layout,
    schema.view?.node?.filename,
    schema.extension,
    handleConfirmRenameNode,
    canCreate,
    canDelete,
    canRename,
    orderEnabled,
    orderField,
  ]);

  const initialState = useMemo(() => {
    const sortId =
      orderEnabled && orderField
        ? schema.view?.default?.sort || orderField
        : viewFields == null
          ? "name"
          : schema.view?.default?.sort ||
            (viewFields.find((item: any) => item.field.name === "date") &&
              "date") ||
            primaryField;

    return {
      sorting: [
        {
          id: sortId,
          desc:
            sortId === "date"
              ? true
              : schema.view?.default?.order === "desc"
                ? true
                : false,
        },
      ],
      pagination: {
        // Reorderable collections stay on one page so a drag index is the
        // entry's true position.
        pageSize: orderEnabled ? 10000 : 25,
      },
      ...(orderEnabled &&
      orderField &&
      !viewFields.some((item: any) => item.path === orderField)
        ? { columnVisibility: { [orderField]: false } }
        : {}),
    };
  }, [schema, primaryField, viewFields, orderEnabled, orderField]);

  const handleReorder = useCallback(
    async (orderedPaths: string[]) => {
      if (!orderField) return;

      const prevData = data;
      const indexByPath = new Map(orderedPaths.map((p, i) => [p, i]));
      const items = orderedPaths.map((itemPath, index) => {
        const row: any = prevData.find((item: any) => item.path === itemPath);
        return { path: itemPath, sha: row?.sha, value: index };
      });

      setIsReordering(true);
      // Optimistic: rows re-sort instantly since the table sorts by orderField.
      setCollectionData((current) =>
        current.map((item: any) =>
          indexByPath.has(item.path)
            ? {
                ...item,
                fields: withFieldValue(
                  item.fields,
                  orderField,
                  indexByPath.get(item.path)!
                ),
              }
            : item
        )
      );

      try {
        const response = await fetch(
          `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collections/${encodeURIComponent(name)}/reorder`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: collectionPath, items }),
          }
        );
        const result = await requireApiSuccess<any>(
          response,
          "Failed to save the new order"
        );

        const updated: { path: string; sha: string | null }[] =
          result.data?.updated ?? [];
        if (updated.length > 0) {
          const shaByPath = new Map(updated.map((u) => [u.path, u.sha]));
          setCollectionData((current) =>
            current.map((item: any) =>
              shaByPath.has(item.path)
                ? { ...item, sha: shaByPath.get(item.path) ?? item.sha }
                : item
            )
          );
        }

        const collectionKeyPrefix = `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collections/${encodeURIComponent(name)}?`;
        void invalidateUrlKeys(queryClient, (url) =>
          url.startsWith(collectionKeyPrefix)
        );
      } catch (error: any) {
        setCollectionData(() => prevData);
        toast.error(error?.message ?? "Failed to save the new order");
      } finally {
        setIsReordering(false);
      }
    },
    [
      collectionPath,
      config.branch,
      config.owner,
      config.repo,
      data,
      name,
      orderField,
      queryClient,
      setCollectionData,
    ]
  );

  const handleNavigate = useCallback(
    (newPath: string) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("path", newPath || schema.path);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, schema.path, searchParams]
  );

  const handleExpand = useCallback(
    async (row: any) => {
      if (!row) return;
      const subRows = await fetchCollectionData(
        row.isNode ? row.parentPath : row.path
      );
      if (subRows !== undefined) {
        setCollectionData((currentData: any[]) => {
          const updateNestedData = (items: any[]): any[] => {
            return items.map((item: any) => {
              if (item.path === row.path) return { ...item, subRows };
              if (item.subRows && Array.isArray(item.subRows)) {
                const updatedSubRows = updateNestedData(item.subRows);
                if (updatedSubRows !== item.subRows) {
                  return { ...item, subRows: updatedSubRows };
                }
              }
              return item;
            });
          };

          return updateNestedData(currentData);
        });
      }
    },
    [fetchCollectionData, setCollectionData]
  );

  const loadingSkeleton = useMemo(
    () => (
      <div className="bg-background rounded-xl border shadow-xs overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/50 border-b font-medium">
            <th className="h-10 p-2 align-middle">
              <Skeleton className="h-4 w-8 rounded" />
            </th>
            <th className="h-10 p-2 align-middle">
              <Skeleton className="h-4 w-16 rounded" />
            </th>
            <th className="h-10 p-2 align-middle">
              <Skeleton className="h-4 w-12 rounded" />
            </th>
            <th className="h-10 p-2 align-middle">
              <Skeleton className="h-4 w-12 rounded" />
            </th>
          </tr>
        </thead>
        <tbody>
          {[...Array(5)].map((_, index) => (
            <tr className="border-b" key={index}>
              <td className="h-12 p-2 py-0 align-middle">
                <Skeleton className="h-8 w-8 rounded-md" />
              </td>
              <td className="h-12 w-full max-w-px min-w-[12rem] p-2 py-0 align-middle">
                <Skeleton className="h-5 w-full rounded" />
              </td>
              <td className="h-12 p-2 py-0 align-middle">
                <Skeleton className="h-5 w-24 rounded" />
              </td>
              <td className="h-12 p-2 py-0 align-middle">
                <div className="flex justify-end gap-1">
                  <ButtonGroup>
                    <Button variant="outline" size="sm" disabled>
                      Edit
                    </Button>
                    <Button variant="outline" size="icon-sm" disabled>
                      <EllipsisVertical className="size-4" />
                    </Button>
                  </ButtonGroup>
                  {schema.view?.layout === "tree" && (
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="h-8 w-8"
                      disabled
                    >
                      <Plus className="size-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    ),
    [schema.view?.layout]
  );

  const addEntryHref = useMemo(() => {
    const params = new URLSearchParams();
    if (schema.view?.layout !== "tree" && path && path !== schema.path)
      params.set("parent", path);
    if (orderEnabled && orderField) {
      // Default a new entry's order to max + 1 so it lands at the bottom.
      const values = data
        .filter((item: any) => item.type === "file")
        .map((item: any) => Number(safeAccess(item.fields ?? {}, orderField)))
        .filter((value) => Number.isFinite(value));
      params.set(
        "order",
        String(values.length > 0 ? Math.max(...values) + 1 : 0)
      );
    }
    const query = params.toString();
    return `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}/new${query ? `?${query}` : ""}`;
  }, [
    config.branch,
    config.owner,
    config.repo,
    data,
    name,
    orderEnabled,
    orderField,
    path,
    schema.path,
    schema.view?.layout,
  ]);

  const breadcrumbNode = useMemo(() => {
    const groupTrail: GroupTrailItem[] = Array.isArray(schema.groupTrail)
      ? schema.groupTrail
      : [];
    const normalizedRootPath = normalizePath(schema.path);
    const normalizedCurrentPath = normalizePath(collectionPath);
    const relativePath = getRelativePath(
      normalizedCurrentPath,
      normalizedRootPath
    );
    const segments = relativePath
      ? relativePath.split("/").filter(Boolean)
      : [];

    const entries = segments.map((segment, index) => ({
      name: segment,
      path: joinPathSegments([
        normalizedRootPath,
        segments.slice(0, index + 1).join("/"),
      ]),
    }));

    const middleEntries = entries.length > 3 ? entries.slice(1, -1) : [];
    const visibleEntries =
      entries.length > 3 ? [entries[0], entries[entries.length - 1]] : entries;

    return (
      <Breadcrumb>
        <BreadcrumbList className="flex-nowrap text-lg font-semibold">
          {groupTrail.map((group) => (
            <Fragment key={`group-${group.name}`}>
              <BreadcrumbItem>
                <span>{group.label || group.name}</span>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </Fragment>
          ))}
          <BreadcrumbItem
            className={
              entries.length === 0 ? "max-w-full min-w-0 truncate" : undefined
            }
          >
            {entries.length > 0 ? (
              <BreadcrumbLink
                className="cursor-pointer"
                onClick={() => handleNavigate(schema.path)}
              >
                {schema.label || schema.name}
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage className="block max-w-full truncate font-semibold">
                {schema.label || schema.name}
              </BreadcrumbPage>
            )}
          </BreadcrumbItem>
          {entries.length > 0 && <BreadcrumbSeparator />}

          {entries.length > 3 && (
            <>
              <BreadcrumbItem>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center">
                    <BreadcrumbEllipsis className="size-4" />
                    <span className="sr-only">Show hidden segments</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {middleEntries.map((entry) => (
                      <DropdownMenuItem
                        key={entry.path}
                        onClick={() => handleNavigate(entry.path)}
                        className="cursor-pointer"
                      >
                        {entry.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}

          {visibleEntries.map((entry, index) => {
            const isLast = index === visibleEntries.length - 1;
            return (
              <Fragment key={entry.path}>
                <BreadcrumbItem
                  className={isLast ? "max-w-full min-w-0 truncate" : undefined}
                >
                  {isLast ? (
                    <BreadcrumbPage className="block max-w-full truncate font-semibold">
                      {entry.name}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      className="cursor-pointer"
                      onClick={() => handleNavigate(entry.path)}
                    >
                      {entry.name}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    );
  }, [
    collectionPath,
    handleNavigate,
    schema.groupTrail,
    schema.label,
    schema.name,
    schema.path,
  ]);

  const headerNode = useMemo(
    () => (
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 truncate">{breadcrumbNode}</div>
        <CollectionHeaderActions
          addEntryHref={addEntryHref}
          collectionPath={collectionPath}
          name={name}
          showAddEntry={canCreate}
          showFolderCreate={schema.subfolders !== false && canCreate}
          onFolderCreate={handleFolderCreate}
          onSearchChange={handleTableSearchChange}
        />
      </div>
    ),
    [
      addEntryHref,
      breadcrumbNode,
      collectionPath,
      config.branch,
      config.owner,
      config.repo,
      handleFolderCreate,
      handleTableSearchChange,
      canCreate,
      name,
      schema.format,
      schema.label,
      schema.name,
      schema.path,
      schema.subfolders,
    ]
  );

  useRepoHeader({
    header: headerNode,
  });

  const isLoading = collectionQuery.isPending;

  const contentNode = isLoading ? (
    loadingSkeleton
  ) : error ? (
    <div className="flex flex-1 items-center justify-center">
      <Empty className="max-w-[420px] flex-none">
        <EmptyHeader>
          <EmptyTitle>
            {error === "Not found"
              ? "Folder not found"
              : "Something went wrong"}
          </EmptyTitle>
          <EmptyDescription>
            {error === "Not found"
              ? `The collection folder "${schema.path}" does not exist yet.`
              : error}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          {error === "Not found" ? (
            canCreate ? (
              <EmptyCreate type="content" name={schema.name}>
                Create folder
              </EmptyCreate>
            ) : null
          ) : (
            <Link
              className={buttonVariants({ variant: "default" })}
              href={`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/settings`}
            >
              Go to settings
            </Link>
          )}
        </EmptyContent>
      </Empty>
    </div>
  ) : (
    <CollectionTable
      columns={columns}
      data={data}
      search={tableSearch}
      setSearch={setTableSearch}
      initialState={initialState}
      onExpand={handleExpand}
      pathname={pathname}
      path={path || schema.path}
      isTree={schema.view?.layout === "tree"}
      primaryField={primaryField}
      orderField={orderEnabled ? orderField : undefined}
      onReorder={handleReorder}
      reorderDisabled={isReordering}
    />
  );

  return <div className="flex min-w-0 flex-col space-y-6">{contentNode}</div>;
}
