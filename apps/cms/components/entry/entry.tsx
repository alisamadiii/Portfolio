"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConfig } from "@/contexts/config-context";
import { EllipsisVertical, Lock, LockOpen, Save } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApiSuccess, EntryData } from "@/types/api";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

import { requireApiSuccess } from "@/lib/api-client";
import { invalidateUrlKeys } from "@/lib/query";
import { parseAndValidateConfig } from "@/lib/config";
import { resolveContentOperations } from "@/lib/operations";
import { getPreviewUrl } from "@/lib/preview";
import {
  generateFilename,
  getPrimaryField,
  getSchemaByName,
  safeAccess,
} from "@/lib/schema";
import {
  getFileExtension,
  getFileName,
  getParentPath,
  getRelativePath,
  joinPathSegments,
  normalizePath,
} from "@/lib/utils/file";

import { EmptyCreate } from "@/components/empty-create";
import { FileOptions } from "@/components/file/file-options";
import { MediaLibraryProvider } from "@/components/media/media-library-panel";
import { useRepoHeader } from "@/components/repo/repo-header-context";

import { EntryForm } from "./entry-form";
import { PreviewPanel } from "./preview-panel";

// Shown once per browser the first time a user saves — see the save gate below.
const SAVE_EDU_KEY = "cms:save-education-ack";
function readSaveEduAck() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SAVE_EDU_KEY) === "1";
}

type LintView = {
  state: {
    doc: {
      toString(): string;
    };
  };
};

type GroupTrailItem = {
  name: string;
  label?: string | null;
};

export function Entry({
  name = "",
  path: initialPath,
  parent,
  title,
  headerMeta,
  onSave,
  initialValues,
}: {
  name?: string;
  path?: string;
  parent?: string;
  title?: string;
  headerMeta?: ReactNode;
  onSave?: (data: Record<string, unknown>) => void;
  initialValues?: Record<string, unknown>;
}) {
  const [path, setPath] = useState<string | undefined>(initialPath);
  const [entry, setEntry] = useState<EntryData | null>();
  const [sha, setSha] = useState<string | undefined>();
  const [displayTitle, setDisplayTitle] = useState<string>(() => {
    if (title) return title;
    if (initialPath && initialPath !== ".pages.yml") {
      return `Editing "${getFileName(normalizePath(initialPath))}"`;
    }
    return "Edit";
  });
  const [isLoading, setIsLoading] = useState(path ? true : false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [hasRegisteredChanges, setHasRegisteredChanges] = useState(false);
  const [error, setError] = useState<string | undefined | null>(null);
  const changeVersionRef = useRef(0);

  // First-save education dialog (once per browser).
  const [saveEduAcked, setSaveEduAcked] = useState(readSaveEduAck);
  const [saveEduOpen, setSaveEduOpen] = useState(false);
  const pendingSaveRef = useRef<Record<string, unknown> | null>(null);
  const queryClient = useQueryClient();

  const router = useRouter();

  const { config } = useConfig();
  if (!config) throw new Error(`Configuration not found.`);

  const schema = useMemo(() => {
    if (!name) return;
    return getSchemaByName(config?.object, name);
  }, [config, name]);
  const schemaType = schema?.type;
  const operations = useMemo(
    () =>
      resolveContentOperations({
        schema,
        scope:
          path === ".pages.yml" || initialPath === ".pages.yml"
            ? "settings"
            : undefined,
      }),
    [initialPath, path, schema]
  );
  const canCreate = operations.create;
  const canRename = operations.rename;
  const canDelete = operations.delete;
  const isFileEditorMode = !schema?.fields || schema.fields.length === 0;
  const filenameFieldMode = useMemo(() => {
    if (!schema || schema.type !== "collection") return "hidden";
    if (schema.filenameField === true) return "enabled";
    if (schema.filenameField === "create") return "create";
    if (schema.filenameField === false) return "hidden";
    return isFileEditorMode ? "enabled" : "hidden";
  }, [isFileEditorMode, schema]);
  const showFilenameField = useMemo(() => {
    if (schemaType !== "collection") return false;
    if (filenameFieldMode === "enabled") return true;
    if (filenameFieldMode === "create") return !path;
    return false;
  }, [filenameFieldMode, path, schemaType]);
  const [filenameValue, setFilenameValue] = useState("");
  const [isFilenameUnlocked, setIsFilenameUnlocked] = useState(false);

  const entryFields = useMemo(() => {
    return !schema?.fields || schema.fields.length === 0
      ? [
          {
            name: "body",
            type: "code",
            label: showFilenameField ? "Content" : false,
            options: {
              format:
                schema?.extension ||
                (entry?.name && getFileExtension(entry.name)) ||
                "markdown",
              lintFn:
                path === ".pages.yml"
                  ? (view: LintView) => {
                      const { parseErrors, validationErrors } =
                        parseAndValidateConfig(view.state.doc.toString());
                      return [...parseErrors, ...validationErrors];
                    }
                  : undefined,
            },
          },
        ]
      : schema?.list === true
        ? [
            {
              name: "listWrapper",
              label: false,
              type: "object",
              list: true,
              fields: schema.fields,
            },
          ]
        : schema.fields;
  }, [schema, entry, path, showFilenameField]);

  const previewTarget = useMemo(
    () =>
      getPreviewUrl(config, name, {
        slug: path
          ? getFileName(normalizePath(path)).replace(/\.[^./]+$/, "")
          : undefined,
        fields: entry?.contentObject as Record<string, unknown> | undefined,
      }),
    [config, name, path, entry]
  );

  const entryContentObject = useMemo(() => {
    return path
      ? schema?.list === true
        ? { listWrapper: entry?.contentObject }
        : entry?.contentObject
      : schema?.list === true
        ? { listWrapper: [] }
        : { ...(initialValues ?? {}) };
  }, [schema, entry, path, initialValues]);

  useEffect(() => {
    if (!showFilenameField || schemaType !== "collection" || !schema) return;

    if (path) {
      setFilenameValue(getFileName(normalizePath(path)));
      setIsFilenameUnlocked(false);
      return;
    }

    const generated = generateFilename(
      schema.filename,
      schema,
      entryContentObject as Record<string, unknown>
    );
    setFilenameValue(generated || "untitled");
    setIsFilenameUnlocked(true);
  }, [entryContentObject, path, schema, schemaType, showFilenameField]);

  const entryApiUrl = useMemo(
    () =>
      path
        ? `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/entries/${encodeURIComponent(path)}?name=${encodeURIComponent(name)}`
        : null,
    [config.branch, config.owner, config.repo, name, path]
  );

  const fetchEntryByUrl = useCallback(
    async (apiUrl: string, signal?: AbortSignal): Promise<EntryData> => {
      const response = await fetch(apiUrl, { signal });
      const data = await requireApiSuccess<any>(
        response,
        "Failed to fetch entry"
      );
      return data.data as EntryData;
    },
    []
  );

  const entryQuery = useQuery({
    queryKey: [entryApiUrl ?? ""],
    queryFn: ({ signal }) => fetchEntryByUrl(entryApiUrl!, signal),
    enabled: !!entryApiUrl,
    staleTime: 2_000,
  });
  // isLoading, not isPending: a disabled query (no path) must not read as loading.
  const swrEntryData = entryQuery.data;
  const swrEntryError = entryQuery.error;

  useEffect(() => {
    if (!path) return;
    setIsLoading(entryQuery.isLoading);
  }, [path, entryQuery.isLoading]);

  useEffect(() => {
    if (!swrEntryData || !path) return;
    setEntry(swrEntryData);
    setSha(swrEntryData.sha);
    setHasRegisteredChanges(false);
    setIsLoading(false);
    setError(null);

    if (initialPath && schema && schema.type === "collection") {
      const primaryField = getPrimaryField(schema);
      const primaryValue = primaryField
        ? safeAccess(swrEntryData.contentObject ?? {}, primaryField)
        : undefined;
      const hasPrimaryValue =
        typeof primaryValue === "string"
          ? primaryValue !== ""
          : primaryValue != null;
      const titleValue = hasPrimaryValue
        ? String(primaryValue)
        : getFileName(normalizePath(path));
      setDisplayTitle(`Editing "${titleValue}"`);
    } else if (!title && path && path !== ".pages.yml") {
      setDisplayTitle(`Editing "${getFileName(normalizePath(path))}"`);
    }
  }, [initialPath, path, schema, swrEntryData, title]);

  useEffect(() => {
    if (!swrEntryError) return;
    const message =
      swrEntryError instanceof Error
        ? swrEntryError.message
        : "Failed to fetch entry.";
    setError(message);
    setIsLoading(false);
  }, [swrEntryError]);

  const currentFilename = useMemo(
    () => (path ? getFileName(normalizePath(path)) : ""),
    [path]
  );
  const filenameChanged =
    showFilenameField &&
    filenameValue.trim().length > 0 &&
    filenameValue.trim() !== currentFilename;

  const performSave = async (contentObject: Record<string, unknown>) => {
    setIsSaving(true);
    const submitStartChangeVersion = changeVersionRef.current;

    const savePromise = new Promise<ApiSuccess<EntryData>>(
      async (resolve, reject) => {
        try {
          let savePath = path;
          const trimmedFilename = filenameValue.trim();
          const normalizedFilename =
            normalizePath(trimmedFilename).split("/").pop() || "";

          if (showFilenameField && !normalizedFilename) {
            throw new Error("Filename is required.");
          }

          if (!savePath) {
            if (!schema) throw new Error("Cannot create entry without schema.");
            if (!canCreate)
              throw new Error(
                "Creating entries in this content item isn't allowed."
              );
            const basePath = parent ?? schema.path;
            if (basePath == null)
              throw new Error("Cannot create entry without a target path.");
            const generatedFilename = showFilenameField
              ? normalizedFilename
              : generateFilename(schema.filename, schema, contentObject);
            savePath = joinPathSegments([basePath, generatedFilename]);
          } else if (
            filenameChanged &&
            !canRename &&
            schemaType === "collection"
          ) {
            throw new Error("Renaming this entry isn't allowed.");
          } else if (
            showFilenameField &&
            filenameFieldMode === "enabled" &&
            isFilenameUnlocked &&
            filenameChanged &&
            schemaType === "collection"
          ) {
            const newPath = joinPathSegments([
              getParentPath(savePath),
              normalizedFilename,
            ]);
            const renameResponse = await fetch(
              `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/files/${encodeURIComponent(savePath)}/rename`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "content",
                  name,
                  newPath,
                }),
              }
            );
            await requireApiSuccess<any>(
              renameResponse,
              "Failed to rename file"
            );
            savePath = newPath;
            setPath(newPath);
            setIsFilenameUnlocked(false);
            router.replace(
              `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}/edit/${encodeURIComponent(newPath)}`
            );

            const collectionKeyPrefix = `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collections/${encodeURIComponent(name)}?`;
            void invalidateUrlKeys(queryClient, (url) =>
              url.startsWith(collectionKeyPrefix)
            );
          }

          const response = await fetch(
            `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/files/${encodeURIComponent(savePath)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: path === ".pages.yml" ? "settings" : "content",
                name,
                content:
                  schema?.list === true
                    ? contentObject.listWrapper
                    : contentObject,
                sha: sha,
              }),
            }
          );
          const data = await requireApiSuccess<any>(
            response,
            "Failed to save file"
          );

          if (data.data.sha !== sha) setSha(data.data.sha);
          if (submitStartChangeVersion === changeVersionRef.current) {
            setHasRegisteredChanges(false);
          }

          if (!path && schemaType === "collection")
            router.push(
              `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}/edit/${encodeURIComponent(data.data.path)}`
            );
          if (schemaType === "collection") {
            const collectionKeyPrefix = `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collections/${encodeURIComponent(name)}?`;
            void invalidateUrlKeys(queryClient, (url) =>
              url.startsWith(collectionKeyPrefix)
            );
          }

          resolve(data);
        } catch (error) {
          reject(error);
        }
      }
    );

    toast.promise(savePromise, {
      loading: "Saving your file",
      success: (response: ApiSuccess<EntryData>) => {
        if (onSave) onSave(response.data);
        return response.message;
      },
      error: (error: unknown) =>
        error instanceof Error ? error.message : "Failed to save file.",
    });

    try {
      await savePromise;
      if (submitStartChangeVersion === changeVersionRef.current) {
        setHasRegisteredChanges(false);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error(error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // First save in this browser: educate before saving. RHF has already validated
  // by the time this runs, so the captured values are safe to save later verbatim.
  const onSubmit = async (contentObject: Record<string, unknown>) => {
    if (!saveEduAcked) {
      pendingSaveRef.current = contentObject;
      setSaveEduOpen(true);
      return;
    }
    await performSave(contentObject);
  };

  const ackSaveEdu = () => {
    window.localStorage.setItem(SAVE_EDU_KEY, "1");
    setSaveEduAcked(true);
  };
  const confirmSaveEdu = () => {
    ackSaveEdu();
    setSaveEduOpen(false);
    const pending = pendingSaveRef.current;
    pendingSaveRef.current = null;
    if (pending) void performSave(pending);
  };
  const dismissSaveEdu = () => {
    ackSaveEdu();
    setSaveEduOpen(false);
    pendingSaveRef.current = null;
  };

  const isBusy = isLoading || isSaving;

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "s") return;
      if (!event.metaKey && !event.ctrlKey) return;
      if (event.altKey) return;

      event.preventDefault();
      if (isBusy) return;

      const form = document.querySelector<HTMLFormElement>("form#entry-form");
      if (form) {
        form.requestSubmit();
      }
    };

    window.addEventListener("keydown", handleSaveShortcut);
    return () => window.removeEventListener("keydown", handleSaveShortcut);
  }, [isBusy]);

  const handleDelete = useCallback(
    (path: string) => {
      // TODO: disable save button or freeze form while deleting?
      if (schemaType === "collection") {
        const collectionKeyPrefix = `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collections/${encodeURIComponent(name)}?`;
        void invalidateUrlKeys(queryClient, (url) =>
          url.startsWith(collectionKeyPrefix)
        );
      }
      if (schemaType === "collection") {
        router.push(
          `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}`
        );
      } else if (entryApiUrl) {
        // Clear the cached entry and refetch — the 404 flips the view to the
        // "Not found" empty state, same as SWR's revalidate did.
        void queryClient.resetQueries({ queryKey: [entryApiUrl] });
      }
    },
    [
      config.branch,
      config.owner,
      config.repo,
      entryApiUrl,
      name,
      queryClient,
      router,
      schemaType,
    ]
  );

  const handleRename = useCallback(
    (oldPath: string, newPath: string) => {
      if (schemaType === "collection") {
        const collectionKeyPrefix = `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collections/${encodeURIComponent(name)}?`;
        void invalidateUrlKeys(queryClient, (url) =>
          url.startsWith(collectionKeyPrefix)
        );
      }
      if (entryApiUrl) {
        // Drop the stale cache for the old path — the observer is about to
        // switch keys via setPath, so no refetch is needed.
        queryClient.removeQueries({ queryKey: [entryApiUrl] });
      }
      setPath(newPath);
      router.replace(
        `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}/edit/${encodeURIComponent(newPath)}`
      );
    },
    [
      config.branch,
      config.owner,
      config.repo,
      entryApiUrl,
      name,
      queryClient,
      router,
      schemaType,
    ]
  );

  const breadcrumbNode = useMemo(() => {
    if (!schema) {
      return (
        <BreadcrumbPage className="truncate font-semibold">
          {displayTitle}
        </BreadcrumbPage>
      );
    }

    const groupTrail: GroupTrailItem[] = Array.isArray(schema.groupTrail)
      ? schema.groupTrail
      : [];

    if (schemaType !== "collection") {
      return (
        <>
          {groupTrail.map((group) => (
            <Fragment key={`group-${group.name}`}>
              <BreadcrumbItem>
                <span>{group.label || group.name}</span>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </Fragment>
          ))}
          <BreadcrumbItem className="truncate">
            <BreadcrumbPage className="truncate font-semibold">
              {displayTitle}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </>
      );
    }

    const rootLabel = schema.label || schema.name || name;

    if (!path) {
      return (
        <>
          {groupTrail.map((group) => (
            <Fragment key={`group-${group.name}`}>
              <BreadcrumbItem>
                <span>{group.label || group.name}</span>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </Fragment>
          ))}
          <BreadcrumbItem>
            <BreadcrumbLink
              render={
                <Link
                  href={`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}`}
                >
                  {rootLabel}
                </Link>
              }
            />
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="truncate">
            <BreadcrumbPage className="truncate font-semibold">
              {displayTitle}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </>
      );
    }

    const rootPath = normalizePath(schema.path);
    const parentPath = normalizePath(getParentPath(path));
    const relativePath = getRelativePath(parentPath, rootPath);
    const segments = relativePath
      ? relativePath.split("/").filter(Boolean)
      : [];

    const parentEntries = segments.map((segment, index) => ({
      name: segment,
      path: joinPathSegments([
        rootPath,
        segments.slice(0, index + 1).join("/"),
      ]),
    }));

    const immediateParent =
      parentEntries.length > 0 ? parentEntries[parentEntries.length - 1] : null;
    const middleEntries =
      parentEntries.length > 1 ? parentEntries.slice(0, -1) : [];

    return (
      <>
        {groupTrail.map((group) => (
          <Fragment key={`group-${group.name}`}>
            <BreadcrumbItem>
              <span>{group.label || group.name}</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </Fragment>
        ))}
        <BreadcrumbItem>
          <BreadcrumbLink
            render={
              <Link
                href={`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}`}
              >
                {rootLabel}
              </Link>
            }
          />
        </BreadcrumbItem>
        <BreadcrumbSeparator />

        {middleEntries.length > 0 && (
          <>
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center">
                  <BreadcrumbEllipsis className="h-4 w-4" />
                  <span className="sr-only">Show hidden segments</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {middleEntries.map((entry) => (
                    <DropdownMenuItem
                      key={entry.path}
                      render={
                        <Link
                          href={`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}?path=${encodeURIComponent(entry.path)}`}
                        >
                          {entry.name}
                        </Link>
                      }
                    />
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}

        {immediateParent && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink
                render={
                  <Link
                    href={`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}?path=${encodeURIComponent(immediateParent.path)}`}
                  >
                    {immediateParent.name}
                  </Link>
                }
              />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}

        <BreadcrumbItem className="truncate">
          <BreadcrumbPage className="truncate font-semibold">
            {displayTitle}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </>
    );
  }, [
    config.branch,
    config.owner,
    config.repo,
    displayTitle,
    name,
    path,
    schema,
    schemaType,
  ]);
  const isCreationBlocked = !path && schemaType === "collection" && !canCreate;
  const showHeaderActions = error !== "Not found" && !isCreationBlocked;
  const headerActionsNode = null;

  const headerNode = useMemo(
    () => (
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <Breadcrumb className="min-w-0 overflow-hidden">
            <BreadcrumbList className="min-w-0 flex-nowrap text-lg font-semibold">
              {breadcrumbNode}
            </BreadcrumbList>
          </Breadcrumb>
          {headerMeta}
        </div>
        {showHeaderActions && (
          <div className="flex shrink-0 items-center gap-x-2">
            {headerActionsNode}
            <Button
              type="submit"
              form="entry-form"
              onClick={() => {
                // Base UI's Button forces type="button" on the native element,
                // overriding type="submit" — so a click never submits the form.
                // Trigger the submit explicitly (mirrors the Cmd/Ctrl+S handler).

                const form =
                  document.querySelector<HTMLFormElement>("form#entry-form");
                form?.requestSubmit();
              }}
              disabled={
                isBusy ||
                (showFilenameField && filenameValue.trim().length === 0) ||
                (Boolean(path) &&
                  !(
                    isFormDirty ||
                    hasRegisteredChanges ||
                    (showFilenameField &&
                      filenameFieldMode === "enabled" &&
                      isFilenameUnlocked &&
                      filenameChanged)
                  ))
              }
              aria-label="Save"
            >
              <Save className="size-4 sm:hidden" />
              <span className="hidden sm:inline">Save</span>
            </Button>
            {path && (
              <ButtonGroup>
                {sha ? (
                  <FileOptions
                    path={path}
                    sha={sha}
                    type={
                      path === ".pages.yml"
                        ? "settings"
                        : (schemaType ?? "content")
                    }
                    name={name}
                    canDelete={canDelete}
                    canRename={canRename}
                    onDelete={handleDelete}
                    onRename={handleRename}
                  >
                    <Button variant="outline" size="icon" disabled={isBusy}>
                      <EllipsisVertical />
                    </Button>
                  </FileOptions>
                ) : (
                  <Button variant="outline" size="icon" disabled>
                    <EllipsisVertical />
                  </Button>
                )}
              </ButtonGroup>
            )}
          </div>
        )}
      </div>
    ),
    [
      breadcrumbNode,
      canDelete,
      canRename,
      filenameChanged,
      filenameFieldMode,
      filenameValue,
      handleDelete,
      handleRename,
      hasRegisteredChanges,
      headerActionsNode,
      headerMeta,
      isBusy,
      isFilenameUnlocked,
      isFormDirty,
      isLoading,
      name,
      path,
      schemaType,
      sha,
      showFilenameField,
      showHeaderActions,
    ]
  );

  useRepoHeader({ header: headerNode });

  const loadingSkeleton = useMemo(
    () => (
      <div className="mx-auto grid w-full max-w-screen-md items-start gap-6">
        {path !== ".pages.yml" ? (
          <>
            <div className="space-y-2">
              <Skeleton className="bg-background h-5 w-24 rounded" />
              <Skeleton className="bg-background h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="bg-background h-5 w-24 rounded" />
              <Skeleton className="bg-background h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="bg-background h-5 w-24 rounded" />
              <div className="grid auto-cols-max grid-flow-col gap-4">
                <Skeleton className="bg-background h-28 w-28 rounded-md" />
                <Skeleton className="bg-background h-28 w-28 rounded-md" />
                <Skeleton className="bg-background h-28 w-28 rounded-md" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="bg-background h-5 w-24 rounded" />
              <Skeleton className="bg-background h-60 w-full rounded-md" />
            </div>
          </>
        ) : (
          <Skeleton className="bg-background h-96 w-full rounded-md" />
        )}
      </div>
    ),
    [path]
  );

  if (error) {
    // TODO: should we use a custom error class with code?
    // TODO: errors show no header (unlike collection and media). Consider standardizing templates.
    if (error === "Not found") {
      const isSettingsPage = path === ".pages.yml";
      return (
        <div className="absolute inset-0 flex items-center justify-center p-4 md:p-6">
          <Empty className="max-w-[420px] flex-none">
            <EmptyHeader>
              <EmptyTitle>
                {isSettingsPage ? "Configuration not found" : "File not found"}
              </EmptyTitle>
              <EmptyDescription>
                {isSettingsPage
                  ? 'The configuration file ".pages.yml" does not exist yet.'
                  : `The file "${path ?? schema?.path ?? "unknown"}" does not exist yet.`}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {isSettingsPage ? (
                <EmptyCreate type="settings">
                  Create configuration file
                </EmptyCreate>
              ) : canCreate ? (
                <EmptyCreate type="content" name={schema?.name ?? name}>
                  Create file
                </EmptyCreate>
              ) : null}
            </EmptyContent>
          </Empty>
        </div>
      );
    } else {
      return (
        <div className="absolute inset-0 flex items-center justify-center p-4 md:p-6">
          <Empty className="max-w-[420px] flex-none">
            <EmptyHeader>
              <EmptyTitle>Something went wrong</EmptyTitle>
              <EmptyDescription>{error}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium shadow-xs"
                href={`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/configuration`}
              >
                Go to configuration
              </Link>
            </EmptyContent>
          </Empty>
        </div>
      );
    }
  }

  if (!path && schemaType === "collection" && !canCreate) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-4 md:p-6">
        <Empty className="max-w-[420px] flex-none">
          <EmptyHeader>
            <EmptyTitle>Creating entries is disabled</EmptyTitle>
            <EmptyDescription>
              New entries are not allowed for this collection.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium shadow-xs"
              href={`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}`}
            >
              Back to collection
            </Link>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const entryBody = isLoading ? (
    loadingSkeleton
  ) : (
    <EntryForm
      fields={entryFields}
      contentObject={entryContentObject}
      onSubmit={onSubmit}
      filePath={
        showFilenameField ? (
          <InputGroup data-disabled={path ? !isFilenameUnlocked : false}>
            <InputGroupInput
              value={filenameValue}
              onChange={(event) => setFilenameValue(event.target.value)}
              placeholder="Filename"
              disabled={path ? !isFilenameUnlocked : false}
              aria-label="Filename"
            />
            {path && filenameFieldMode === "enabled" && canRename && (
              <InputGroupAddon align="inline-end">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <InputGroupButton
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setIsFilenameUnlocked((prev) => !prev)}
                        aria-label={
                          isFilenameUnlocked
                            ? "Lock filename"
                            : "Unlock filename"
                        }
                      >
                        {isFilenameUnlocked ? (
                          <LockOpen className="size-3.5" />
                        ) : (
                          <Lock className="size-3.5" />
                        )}
                      </InputGroupButton>
                    }
                  />
                  <TooltipContent>
                    {isFilenameUnlocked ? "Lock filename" : "Unlock to edit"}
                  </TooltipContent>
                </Tooltip>
              </InputGroupAddon>
            )}
          </InputGroup>
        ) : undefined
      }
      onDirtyChange={setIsFormDirty}
      onChangeRegistered={() => {
        changeVersionRef.current += 1;
        setHasRegisteredChanges(true);
      }}
    />
  );

  const formNode = (
    <>
      {entryBody}
      <AlertDialog
        open={saveEduOpen}
        onOpenChange={(open) => {
          if (!open) dismissSaveEdu();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Before you save</AlertDialogTitle>
            <AlertDialogDescription>
              Save publishes this page&apos;s changes. Finish all your edits on
              this page first, then click Save.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="text-muted-foreground list-disc space-y-1.5 pl-5 text-sm">
            <li>
              <span className="text-foreground font-medium">
                Unsaved edits are lost if you switch to another page.
              </span>{" "}
              Each page saves on its own — always Save before leaving.
            </li>
            <li>
              After you save, your changes go live on the site in about 10–20
              seconds.
            </li>
            <li>You&apos;ll only see this message once.</li>
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={dismissSaveEdu}>
              Not now
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmSaveEdu}>
              Got it — save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  // Live preview only makes sense for an existing content entry with a page.
  return (
    <MediaLibraryProvider>
      {previewTarget && path && path !== ".pages.yml" ? (
        <PreviewPanel
          target={previewTarget}
          pageKey={previewTarget.href}
          pageTitle={displayTitle}
        >
          {formNode}
        </PreviewPanel>
      ) : (
        formNode
      )}
    </MediaLibraryProvider>
  );
}
