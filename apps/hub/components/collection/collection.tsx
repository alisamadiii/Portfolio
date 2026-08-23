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
import { EllipsisVertical, FolderPlus, Plus, Search, Trash2 } from "@/components/icon";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@workspace/trpc/client";

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

import { handleCmsError } from "@/lib/trpc-errors";
import { repoPath } from "@/lib/paths";
import { resolveContentOperations } from "@workspace/cms-core/operations";
import {
  draftKey,
  getDraft,
  saveDraftOrThrow,
  useDrafts,
  useDraftsStore,
} from "@/lib/store/drafts";
import {
  getFieldByPath,
  getPrimaryField,
  getSchemaByName,
  safeAccess,
} from "@workspace/cms-core/schema";
import {
  getFileName,
  getParentPath,
  getRelativePath,
  joinPathSegments,
  normalizePath,
  sortFiles,
} from "@workspace/cms-core/utils/file";

import { EmptyCreate } from "@/components/empty-create";
import { FileOptions } from "@/components/file/file-options";
import { FolderCreate } from "@/components/folder-create";
import { useRepoHeader } from "@/components/repo/repo-header-context";

import { Badge } from "@workspace/ui/components/badge";

import { CollectionTable } from "./collection-table";
import {
  EntrySheet,
  type EntrySheetDraft,
} from "@/components/cms/entry-sheet";

type GroupTrailItem = {
  name: string;
  label?: string | null;
};

const CollectionHeaderActions = memo(function CollectionHeaderActions({
  onAddEntry,
  actionNode,
  collectionPath,
  name,
  showAddEntry,
  showFolderCreate,
  onFolderCreate,
  onSearchChange,
}: {
  onAddEntry: () => void;
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
          <Button className="hidden sm:flex" onClick={() => onAddEntry()}>
            New entry
          </Button>
          <Button
            size="icon"
            className="shrink-0 sm:hidden"
            onClick={() => onAddEntry()}
          >
            <Plus className="size-4" />
          </Button>
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

export function Collection({
  name,
  path,
  onOpenEntry,
  onNavigateFolder,
}: {
  name: string;
  path?: string;
  /** Embedded mode (CMS overlay): open an entry in place instead of routing to /edit. */
  onOpenEntry?: (path: string) => void;
  /** Embedded mode: folder navigation via state instead of ?path= routing. */
  onNavigateFolder?: (path: string) => void;
}) {
  const [tableSearch, setTableSearch] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const queryClient = useQueryClient();
  const trpc = useTRPC();

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

  const sortContents = useCallback(
    (contents: Record<string, any>[]): Record<string, any>[] => {
      if (contents.length === 0) return [];
      return [...contents].sort((a: any, b: any) => {
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
  const collectionListInput = useMemo(
    () => ({
      owner: config.owner,
      repo: config.repo,
      branch: config.branch,
      name,
      path: collectionPath,
      fields: requestedFieldPaths,
    }),
    [
      collectionPath,
      config.branch,
      config.owner,
      config.repo,
      name,
      requestedFieldPaths,
    ]
  );
  const rootCollectionKey = useMemo(
    () => trpc.cms.collections.list.queryKey(collectionListInput),
    [collectionListInput, trpc]
  );

  const collectionQuery = useQuery(
    trpc.cms.collections.list.queryOptions(collectionListInput, {
      staleTime: 2_000,
    })
  );
  // Parsing errors reported alongside the contents (was toasted per fetch).
  const listErrors = collectionQuery.data?.errors;
  useEffect(() => {
    listErrors?.forEach((e) => toast.error(e));
  }, [listErrors]);

  // Local drafts for this collection. Gated on mount so the zustand-persist
  // localStorage hydration can't cause an SSR/client mismatch.
  const [draftsMounted, setDraftsMounted] = useState(false);
  useEffect(() => setDraftsMounted(true), []);
  const allDrafts = useDrafts(config.owner, config.repo, config.branch);
  const deleteDraft = useDraftsStore((state) => state.deleteDraft);
  const collectionDrafts = useMemo(
    () =>
      draftsMounted
        ? allDrafts.filter(([, draft]) => draft.schemaName === name)
        : [],
    [allDrafts, draftsMounted, name]
  );
  // Any row (existing or new) with a pending draft, keyed by path.
  const draftInfo = useMemo(
    () =>
      new Map(
        collectionDrafts.map(([key, draft]) => [
          draft.path,
          { isNew: draft.isNew, key, draft },
        ])
      ),
    [collectionDrafts]
  );

  const data = useMemo(() => {
    const contents = collectionQuery.data?.contents ?? [];
    // Overlay the order value from any pending (unpublished) draft so a reorder
    // saved locally stays reflected in the list until it's published. The table
    // sorts by orderField; without this, a background refetch reverts rows to the
    // uncommitted server order and the reorder appears to be lost.
    const overlaid =
      orderEnabled && orderField && draftInfo.size > 0
        ? contents.map((row: any) => {
            const info = draftInfo.get(row.path);
            if (info && !info.isNew) {
              const orderValue = safeAccess(info.draft.values ?? {}, orderField);
              if (typeof orderValue === "number") {
                return {
                  ...row,
                  fields: withFieldValue(row.fields, orderField, orderValue),
                };
              }
            }
            return row;
          })
        : contents;
    return sortContents(overlaid);
  }, [collectionQuery.data, draftInfo, orderEnabled, orderField, sortContents]);
  // New-entry drafts in the current folder become synthetic table rows.
  const draftRows = useMemo(() => {
    const normalizedFolder = normalizePath(collectionPath);
    return collectionDrafts
      .filter(
        ([, draft]) =>
          draft.isNew &&
          normalizePath(getParentPath(draft.path)) === normalizedFolder &&
          !data.some((row: any) => row.path === draft.path)
      )
      .map(([key, draft]) => ({
        sha: "",
        name: getFileName(draft.path),
        parentPath: getParentPath(draft.path),
        path: draft.path,
        fields: draft.values,
        type: "file",
        isDraft: true,
        draftKey: key,
      }));
  }, [collectionDrafts, collectionPath, data]);
  const tableData = useMemo(
    () => (draftRows.length > 0 ? [...data, ...draftRows] : data),
    [data, draftRows]
  );

  const [entryDialog, setEntryDialog] = useState<{
    open: boolean;
    parent?: string;
    draft?: EntrySheetDraft;
  }>({ open: false });
  const openNewEntry = useCallback((parentOverride?: string) => {
    setEntryDialog({ open: true, parent: parentOverride });
  }, []);
  const openDraft = useCallback((draft: EntrySheetDraft) => {
    setEntryDialog({ open: true, draft });
  }, []);
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
      queryClient.setQueryData(rootCollectionKey, (prev) => ({
        errors: [] as string[],
        ...(prev ?? {}),
        contents: updater(prev?.contents ?? []),
      }));
    },
    [queryClient, rootCollectionKey]
  );

  const fetchCollectionData = useCallback(
    async (fetchPath: string): Promise<Record<string, any>[] | undefined> => {
      try {
        // ensureQueryData returns cached rows regardless of staleness,
        // otherwise fetches and stores — the old "cache or fetch" behavior.
        const result = await queryClient.ensureQueryData(
          trpc.cms.collections.list.queryOptions(
            { ...collectionListInput, path: fetchPath },
            { staleTime: Infinity }
          )
        );
        if (result.errors?.length) {
          result.errors.forEach((e: string) => toast.error(e));
        }
        return sortContents(result.contents ?? []);
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
    [
      collectionListInput,
      path,
      queryClient,
      schema.path,
      sortContents,
      trpc,
    ]
  );

  const renameFileMutation = useMutation(
    trpc.cms.files.rename.mutationOptions()
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

        const renamePromise = renameFileMutation.mutateAsync({
          owner: config.owner,
          repo: config.repo,
          branch: config.branch,
          path: normalizedPath,
          type: "content",
          name,
          newPath: normalizedNewPath,
        });

        toast.promise(renamePromise, {
          loading: `Renaming "${path}" to "${newPath}"`,
          success: (data) => {
            router.push(
              `/${config.repo}/collection/${encodeURIComponent(name)}/new?parent=${encodeURIComponent(getParentPath(normalizedNewPath))}`
            );
            return data.message;
          },
          error: (error: unknown) =>
            handleCmsError(error, "Failed to rename file"),
        });
      } catch (error) {
        console.error(error);
      }
    },
    [
      config.owner,
      config.repo,
      config.branch,
      name,
      renameFileMutation,
      router,
    ]
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
                const rowDraft = draftInfo.get(row.original.path);
                const draftBadge = rowDraft ? (
                  <Badge className="ml-2 shrink-0 border-amber-400 bg-amber-400/10 text-amber-700 dark:text-amber-400">
                    Draft
                  </Badge>
                ) : null;
                // New-entry drafts have no file on GitHub — they open back in
                // the entry dialog instead of the full editor.
                if (rowDraft?.isNew) {
                  return (
                    <button
                      type="button"
                      className="flex min-w-0 items-center text-left"
                      onClick={() =>
                        openDraft({ key: rowDraft.key, draft: rowDraft.draft })
                      }
                    >
                      <span className="truncate font-medium">{CellView}</span>
                      {draftBadge}
                    </button>
                  );
                }
                return (
                  <span className="flex min-w-0 items-center">
                    {onOpenEntry ? (
                      <button
                        type="button"
                        className="truncate text-left font-medium"
                        onClick={() => onOpenEntry(row.original.path)}
                      >
                        {CellView}
                      </button>
                    ) : (
                      <Link
                        className="truncate font-medium"
                        href={`/${config.repo}/collection/${encodeURIComponent(name)}/edit/${encodeURIComponent(row.original.path)}`}
                      >
                        {CellView}
                      </Link>
                    )}
                    {draftBadge}
                  </span>
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
          {row.original.type === "file" &&
            (draftInfo.get(row.original.path)?.isNew ? (
              <ButtonGroup>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const rowDraft = draftInfo.get(row.original.path)!;
                    openDraft({ key: rowDraft.key, draft: rowDraft.draft });
                  }}
                >
                  Edit
                </Button>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => {
                          deleteDraft(row.original.draftKey);
                          toast.success("Draft discarded");
                        }}
                      >
                        <Trash2 />
                      </Button>
                    }
                  />
                  <TooltipContent>Discard draft</TooltipContent>
                </Tooltip>
              </ButtonGroup>
            ) : (
              <ButtonGroup>
                {onOpenEntry ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenEntry(row.original.path)}
                  >
                    Edit
                  </Button>
                ) : (
                  <Link
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" })
                    )}
                    href={`/${config.repo}/collection/${name}/edit/${encodeURIComponent(row.original.path)}`}
                  >
                    Edit
                  </Link>
                )}
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
            ))}
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
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="h-8 w-8"
                      onClick={() =>
                        openNewEntry(
                          row.original.isNode
                            ? row.original.parentPath
                            : row.original.path
                        )
                      }
                    >
                      <Plus className="size-4" />
                    </Button>
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
    draftInfo,
    openDraft,
    openNewEntry,
    deleteDraft,
    onOpenEntry,
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

      // Only entries whose order value actually changes need a draft.
      const changed = orderedPaths
        .map((itemPath, index) => {
          const row: any = prevData.find((item: any) => item.path === itemPath);
          const current = Number(safeAccess(row?.fields ?? {}, orderField));
          return { path: itemPath, newOrder: index, changed: current !== index };
        })
        .filter((it) => it.changed);

      if (changed.length === 0) return;

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
        // Route the new order through the same local-draft workflow as edits:
        // nothing hits GitHub until Publish. Each changed entry becomes a draft
        // whose full content matches its file with only the order field updated.
        for (const it of changed) {
          const key = draftKey(
            config.owner,
            config.repo,
            config.branch,
            it.path
          );
          const existing = getDraft(
            config.owner,
            config.repo,
            config.branch,
            it.path
          );

          let baseValues: Record<string, unknown>;
          let sha: string | null;
          let isNew: boolean;
          let title: string | undefined;

          if (existing) {
            // Merge the order change into the user's pending edit for this entry.
            // Directory-collection drafts are always keyed objects (never the
            // array-collection whole-file shape).
            baseValues = existing.values as Record<string, unknown>;
            sha = existing.sha;
            isNew = existing.isNew;
            title = existing.title;
          } else {
            // Publish rewrites the whole file, so the draft needs the entry's
            // full current content — fetch it (same query the publish diff uses).
            const entry = (await queryClient.fetchQuery(
              trpc.cms.entries.get.queryOptions({
                owner: config.owner,
                repo: config.repo,
                branch: config.branch,
                path: it.path,
                name,
              })
            )) as { sha: string; contentObject: Record<string, unknown> };
            baseValues = entry.contentObject;
            sha = entry.sha;
            isNew = false;
            const primaryField = getPrimaryField(schema);
            const primaryValue = primaryField
              ? safeAccess(baseValues, primaryField)
              : undefined;
            if (typeof primaryValue === "string" && primaryValue !== "") {
              title = primaryValue;
            }
          }

          const values = withFieldValue(
            baseValues,
            orderField,
            it.newOrder
          ) as Record<string, unknown>;

          saveDraftOrThrow(key, {
            v: 1,
            path: it.path,
            schemaName: name,
            sha,
            isNew,
            values,
            savedAt: Date.now(),
            title,
          });
        }

        toast.success(
          changed.length === 1
            ? "Reorder saved as a draft — publish to go live"
            : `Reorder saved as ${changed.length} drafts — publish to go live`
        );
      } catch (error: unknown) {
        setCollectionData(() => prevData);
        toast.error(handleCmsError(error, "Failed to save the new order"));
      } finally {
        setIsReordering(false);
      }
    },
    [
      config.branch,
      config.owner,
      config.repo,
      data,
      name,
      orderField,
      queryClient,
      schema,
      setCollectionData,
      trpc,
    ]
  );

  const handleNavigate = useCallback(
    (newPath: string) => {
      if (onNavigateFolder) {
        onNavigateFolder(newPath || schema.path);
        return;
      }
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("path", newPath || schema.path);
      router.push(`${pathname}?${params.toString()}`);
    },
    [onNavigateFolder, pathname, router, schema.path, searchParams]
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

  // Seeds for the new-entry dialog: current subfolder + manual-order position.
  const newEntryParent = useMemo(
    () =>
      schema.view?.layout !== "tree" && path && path !== schema.path
        ? path
        : undefined,
    [path, schema.path, schema.view?.layout]
  );
  const newEntryInitialValues = useMemo(() => {
    if (!orderEnabled || !orderField) return undefined;
    // Default a new entry's order to max + 1 so it lands at the bottom.
    const values = data
      .filter((item: any) => item.type === "file")
      .map((item: any) => Number(safeAccess(item.fields ?? {}, orderField)))
      .filter((value) => Number.isFinite(value));
    return {
      [orderField]: values.length > 0 ? Math.max(...values) + 1 : 0,
    };
  }, [data, orderEnabled, orderField]);
  const takenPaths = useMemo(
    () =>
      new Set<string>([
        ...data.map((row: any) => row.path as string),
        ...collectionDrafts.map(([, draft]) => draft.path),
      ]),
    [data, collectionDrafts]
  );

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
          onAddEntry={openNewEntry}
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
      openNewEntry,
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
    backHref: repoPath(config.repo),
    backLabel: "Canvas",
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
              href={`/${config.repo}/settings`}
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
      data={tableData}
      search={tableSearch}
      setSearch={setTableSearch}
      initialState={initialState}
      onExpand={handleExpand}
      pathname={pathname}
      onNavigateFolder={onNavigateFolder ? handleNavigate : undefined}
      path={path || schema.path}
      isTree={schema.view?.layout === "tree"}
      primaryField={primaryField}
      orderField={orderEnabled ? orderField : undefined}
      onReorder={handleReorder}
      reorderDisabled={isReordering}
    />
  );

  return (
    <div className="flex min-w-0 flex-col space-y-6">
      {contentNode}
      <EntrySheet
        open={entryDialog.open}
        onOpenChange={(open) =>
          setEntryDialog((state) => ({ ...state, open }))
        }
        schemaName={name}
        mode={{
          kind: "new",
          parent: entryDialog.parent ?? newEntryParent,
          initialValues: newEntryInitialValues,
          draft: entryDialog.draft,
          takenPaths,
        }}
      />
    </div>
  );
}
