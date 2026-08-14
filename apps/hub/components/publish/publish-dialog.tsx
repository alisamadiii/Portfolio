"use client";

import { useMemo, useState } from "react";
import { useConfig } from "@/contexts/config-context";
import { toast } from "sonner";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";

import type { EntryData } from "@/types/api";
import type { Field } from "@/types/field";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";

import {
  requireApiSuccess,
  SUBSCRIPTION_REQUIRED_EVENT,
} from "@/lib/api-client";
import {
  computeEntryDiff,
  formatDiffValue,
  type EntryDiffRow,
} from "@/lib/entry-diff";
import { invalidateUrlKeys } from "@/lib/query";
import { getSchemaByName } from "@/lib/schema";
import { useDrafts, useDraftsStore, type Draft } from "@/lib/store/drafts";
import { getFileName, normalizePath } from "@/lib/utils/file";

/** Thrown when a non-new draft's file is gone upstream — treated as stale. */
class EntryNotFoundError extends Error {}

type PublishErrorData = {
  stalePaths?: string[];
  conflictPaths?: string[];
  retry?: boolean;
};

class PublishError extends Error {
  status: number;
  data?: PublishErrorData;

  constructor(message: string, status: number, data?: PublishErrorData) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// Same URL + success shape as the editor's entry query, so both share one
// React Query cache entry (URL-string keys, see lib/query.ts).
const fetchPublishedEntry = async (
  url: string,
  signal?: AbortSignal
): Promise<EntryData> => {
  const response = await fetch(url, { signal });
  if (response.status === 404) {
    throw new EntryNotFoundError("This entry no longer exists on GitHub.");
  }
  const data = await requireApiSuccess<{ data: EntryData }>(
    response,
    "Failed to fetch entry"
  );
  return data.data;
};

// Mirrors entryFields in entry.tsx: file-editor fallback ("body") and
// schema.list wrapping under a synthetic listWrapper object field.
const diffFieldsForSchema = (schema: Record<string, any> | null): Field[] => {
  if (!schema?.fields || schema.fields.length === 0) {
    return [{ name: "body", label: "Content", type: "code" }] as Field[];
  }
  if (schema.list === true) {
    return [
      {
        name: "listWrapper",
        label: false,
        type: "object",
        list: true,
        fields: schema.fields,
      },
    ] as Field[];
  }
  return schema.fields as Field[];
};

// Draft values and entry.contentObject are both list-unwrapped — re-wrap for
// the diff walker when schema.list is true (same as entryContentObject memo).
const wrapContent = (
  schema: Record<string, any> | null,
  content: unknown
): Record<string, unknown> =>
  schema?.list === true
    ? { listWrapper: content ?? [] }
    : ((content as Record<string, unknown> | null | undefined) ?? {});

type EntryReview = {
  key: string;
  draft: Draft;
  status: "loading" | "error" | "ready";
  errorMessage?: string;
  deletedUpstream: boolean;
  isStale: boolean;
  diff: EntryDiffRow[] | null;
};

export function PublishDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { config } = useConfig();
  const queryClient = useQueryClient();
  const [forceOverwrite, setForceOverwrite] = useState(false);
  // Paths the publish API flagged as stale/conflicting on a 409.
  const [serverFlaggedPaths, setServerFlaggedPaths] = useState<string[]>([]);

  const owner = config?.owner ?? "";
  const repo = config?.repo ?? "";
  const branch = config?.branch ?? "";
  const apiBase = `/api/${owner}/${repo}/${encodeURIComponent(branch)}`;

  const drafts = useDrafts(owner, repo, branch);

  const entryQueries = useQueries({
    queries: drafts.map(([, draft]) => {
      const url = `${apiBase}/entries/${encodeURIComponent(draft.path)}?name=${encodeURIComponent(draft.schemaName)}`;
      return {
        queryKey: [url],
        queryFn: ({ signal }: { signal?: AbortSignal }) =>
          fetchPublishedEntry(url, signal),
        enabled: open && !draft.isNew,
        staleTime: 2_000,
        retry: (failureCount: number, error: unknown) =>
          !(error instanceof EntryNotFoundError) && failureCount < 2,
      };
    }),
  });

  const reviews = useMemo<EntryReview[]>(() => {
    if (!config) return [];
    return drafts.map(([key, draft], index) => {
      const schema = getSchemaByName(config.object, draft.schemaName);
      const fields = diffFieldsForSchema(schema);
      let isStale = serverFlaggedPaths.includes(draft.path);
      let deletedUpstream = false;
      let oldContent: unknown = undefined;

      if (!draft.isNew) {
        const query = entryQueries[index];
        if (!query || query.isPending) {
          return {
            key,
            draft,
            status: "loading" as const,
            deletedUpstream: false,
            isStale,
            diff: null,
          };
        }
        if (query.isError) {
          if (query.error instanceof EntryNotFoundError) {
            deletedUpstream = true;
            isStale = true;
          } else {
            return {
              key,
              draft,
              status: "error" as const,
              errorMessage:
                query.error instanceof Error
                  ? query.error.message
                  : "Failed to fetch entry.",
              deletedUpstream: false,
              isStale,
              diff: null,
            };
          }
        } else if (query.data) {
          oldContent = query.data.contentObject;
          if (query.data.sha !== draft.sha) isStale = true;
        }
      }

      const diff = computeEntryDiff(
        fields,
        wrapContent(schema, oldContent),
        wrapContent(schema, draft.values)
      );

      return {
        key,
        draft,
        status: "ready" as const,
        deletedUpstream,
        isStale,
        diff,
      };
    });
  }, [config, drafts, entryQueries, serverFlaggedPaths]);

  const isLoadingAny = reviews.some((review) => review.status === "loading");
  const hasError = reviews.some((review) => review.status === "error");
  const hasStale = reviews.some((review) => review.isStale);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setForceOverwrite(false);
      setServerFlaggedPaths([]);
    }
  };

  const publishMutation = useMutation({
    mutationFn: async ({ force }: { force: boolean }) => {
      const response = await fetch(`${apiBase}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: drafts.map(([, draft]) => ({
            path: draft.path,
            name: draft.schemaName,
            content: draft.values,
            sha: draft.sha,
            isNew: draft.isNew,
          })),
          force: force || undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.status !== "success") {
        if (response.status === 402 && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(SUBSCRIPTION_REQUIRED_EVENT));
        }
        throw new PublishError(
          payload?.message ||
            `Failed to publish: ${response.status} ${response.statusText}`,
          response.status,
          payload?.data
        );
      }
      return { data: payload.data, keys: drafts.map(([key]) => key) };
    },
    onSuccess: ({ keys }) => {
      useDraftsStore.getState().deleteMany(keys);
      // Same URL-prefix invalidation entry.tsx uses after save.
      void invalidateUrlKeys(
        queryClient,
        (url) =>
          url.startsWith(`${apiBase}/entries/`) ||
          url.startsWith(`${apiBase}/collections/`)
      );
      toast.success(
        `Published ${keys.length} ${keys.length === 1 ? "change" : "changes"}`
      );
      setForceOverwrite(false);
      setServerFlaggedPaths([]);
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      if (error instanceof PublishError && error.status === 409) {
        if (error.data?.retry) {
          toast.error("Branch was updated while publishing — please retry.");
          return;
        }
        const flagged = [
          ...(error.data?.stalePaths ?? []),
          ...(error.data?.conflictPaths ?? []),
        ];
        if (flagged.length > 0) {
          setServerFlaggedPaths(flagged);
          // Refetch current content so stale badges reflect the latest state.
          void invalidateUrlKeys(queryClient, (url) =>
            url.startsWith(`${apiBase}/entries/`)
          );
          toast.error(
            error.message ||
              "Some entries changed on GitHub — review before publishing."
          );
          return;
        }
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to publish."
      );
    },
  });

  const canPublish =
    drafts.length > 0 &&
    !isLoadingAny &&
    !hasError &&
    (!hasStale || forceOverwrite) &&
    !publishMutation.isPending;

  if (!config) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Publish drafts</DialogTitle>
          <DialogDescription>
            Review your local drafts before publishing them to GitHub as one
            update.
          </DialogDescription>
        </DialogHeader>
        {drafts.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No drafts to publish.
          </p>
        ) : (
          <div className="-mr-2 flex max-h-[55vh] flex-col gap-4 overflow-y-auto pr-2">
            {reviews.map((review) => (
              <EntryReviewCard
                key={review.key}
                review={review}
                onDiscard={() =>
                  useDraftsStore.getState().deleteDraft(review.key)
                }
              />
            ))}
          </div>
        )}
        {hasStale && (
          <div className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <p className="text-amber-800 dark:text-amber-300">
              Some entries changed on GitHub since these drafts were saved.
              Publishing will overwrite those changes.
            </p>
            <label className="flex items-center gap-2 font-medium">
              <Checkbox
                checked={forceOverwrite}
                onCheckedChange={(checked) =>
                  setForceOverwrite(checked === true)
                }
              />
              Overwrite changes on GitHub
            </label>
          </div>
        )}
        {hasError && (
          <p className="text-destructive text-sm">
            Some entries failed to load from GitHub — resolve this before
            publishing.
          </p>
        )}
        {drafts.length > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!canPublish}
              isLoading={publishMutation.isPending}
              onClick={() =>
                publishMutation.mutate({ force: hasStale && forceOverwrite })
              }
            >
              Publish {drafts.length}{" "}
              {drafts.length === 1 ? "change" : "changes"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EntryReviewCard({
  review,
  onDiscard,
}: {
  review: EntryReview;
  onDiscard: () => void;
}) {
  const { draft } = review;
  const title = draft.title || getFileName(normalizePath(draft.path));

  return (
    <div className="rounded-lg border">
      <div className="flex items-start justify-between gap-2 border-b px-3 py-2">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium">{title}</span>
            {draft.isNew && <Badge variant="secondary">New</Badge>}
            {review.isStale && (
              <Badge
                variant="outline"
                className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              >
                {review.deletedUpstream
                  ? "Deleted on GitHub"
                  : "Changed on GitHub"}
              </Badge>
            )}
          </div>
          <div className="text-muted-foreground truncate font-mono text-xs">
            {draft.path}
          </div>
        </div>
        <Button
          variant="ghost"
          size="xs"
          className="text-muted-foreground hover:text-destructive shrink-0"
          onClick={onDiscard}
        >
          Discard draft
        </Button>
      </div>
      <div className="p-3">
        {review.status === "loading" ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : review.status === "error" ? (
          <p className="text-destructive text-sm">{review.errorMessage}</p>
        ) : review.diff && review.diff.length > 0 ? (
          <div className="flex flex-col gap-2">
            {review.diff.map((row) => (
              <DiffRow key={row.fieldPath} row={row} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">(no field changes)</p>
        )}
      </div>
    </div>
  );
}

function DiffRow({ row }: { row: EntryDiffRow }) {
  return (
    <div className="overflow-hidden rounded-md border text-sm">
      <div className="bg-muted/40 text-muted-foreground border-b px-2.5 py-1 text-xs font-medium">
        {row.label}
      </div>
      {row.kind !== "added" && (
        <div className="flex gap-2 bg-red-500/10 px-2.5 py-1.5">
          <span className="shrink-0 font-mono text-red-700 select-none dark:text-red-400">
            −
          </span>
          <span className="min-w-0 break-words whitespace-pre-wrap text-red-700 dark:text-red-400">
            {formatDiffValue(row.old)}
          </span>
        </div>
      )}
      {row.kind !== "removed" && (
        <div className="flex gap-2 bg-green-500/10 px-2.5 py-1.5">
          <span className="shrink-0 font-mono text-green-700 select-none dark:text-green-400">
            +
          </span>
          <span className="min-w-0 break-words whitespace-pre-wrap text-green-700 dark:text-green-400">
            {formatDiffValue(row.new)}
          </span>
        </div>
      )}
    </div>
  );
}
