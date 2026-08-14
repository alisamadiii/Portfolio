"use client";

import { useMemo, useState } from "react";
import { useConfig } from "@/contexts/config-context";
import { toast } from "sonner";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@workspace/trpc/client";

import type { EntryData } from "@/types/api";
import type { Field } from "@workspace/cms-core/types/field";

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
  computeEntryDiff,
  formatDiffValue,
  type EntryDiffRow,
} from "@/lib/entry-diff";
import { handleCmsError } from "@/lib/trpc-errors";
import { getSchemaByName } from "@workspace/cms-core/schema";
import {
  draftKey,
  useDrafts,
  useDraftsStore,
  type Draft,
} from "@/lib/store/drafts";
import { getFileName, normalizePath } from "@workspace/cms-core/utils/file";

/** A non-new draft's file is gone upstream (404) — treated as stale. */
const isEntryNotFound = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (error as { data?: { code?: string } }).data?.code === "NOT_FOUND";

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
  const trpc = useTRPC();
  const [forceOverwrite, setForceOverwrite] = useState(false);
  // Paths the publish API flagged as stale/conflicting on a conflict result.
  const [serverFlaggedPaths, setServerFlaggedPaths] = useState<string[]>([]);

  const owner = config?.owner ?? "";
  const repo = config?.repo ?? "";
  const branch = config?.branch ?? "";

  const drafts = useDrafts(owner, repo, branch);

  const entryQueries = useQueries({
    queries: drafts.map(([, draft]) =>
      trpc.cms.entries.get.queryOptions(
        { owner, repo, branch, path: draft.path, name: draft.schemaName },
        {
          enabled: open && !draft.isNew,
          staleTime: 2_000,
          retry: (failureCount, error) =>
            !isEntryNotFound(error) && failureCount < 2,
        }
      )
    ),
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
          if (isEntryNotFound(query.error)) {
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
          const entryData = query.data as EntryData;
          oldContent = entryData.contentObject;
          if (entryData.sha !== draft.sha) isStale = true;
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

  const publishMutation = useMutation(
    trpc.cms.publish.publish.mutationOptions({
      onSuccess: (result, variables) => {
        if (result.status === "conflict") {
          // Stale/conflicting drafts come back as a result (not a 409 throw):
          // flag them so the review cards show the amber badges.
          const flagged = [...result.stalePaths, ...result.conflictPaths];
          setServerFlaggedPaths(flagged);
          // Refetch current content so stale badges reflect the latest state.
          void queryClient.invalidateQueries({
            queryKey: trpc.cms.entries.get.queryKey({ owner, repo, branch }),
          });
          toast.error(
            "Some entries changed on GitHub — review before publishing."
          );
          return;
        }

        const keys = variables.files.map((file) =>
          draftKey(owner, repo, branch, file.path)
        );
        useDraftsStore.getState().deleteMany(keys);
        void queryClient.invalidateQueries({
          queryKey: trpc.cms.entries.get.queryKey({ owner, repo, branch }),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.cms.collections.list.queryKey({
            owner,
            repo,
            branch,
          }),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.cms.cache.status.queryKey({ owner, repo, branch }),
        });
        toast.success(
          `Published ${keys.length} ${keys.length === 1 ? "change" : "changes"}`
        );
        setForceOverwrite(false);
        setServerFlaggedPaths([]);
        onOpenChange(false);
      },
      onError: (error: unknown) => {
        toast.error(handleCmsError(error, "Failed to publish."));
      },
    })
  );

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
                publishMutation.mutate({
                  owner,
                  repo,
                  branch,
                  files: drafts.map(([, draft]) => ({
                    path: draft.path,
                    name: draft.schemaName,
                    content: draft.values,
                    sha: draft.sha,
                    isNew: draft.isNew,
                  })),
                  force: (hasStale && forceOverwrite) || undefined,
                })
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
