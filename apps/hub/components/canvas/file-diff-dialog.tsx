"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { FileDiff } from "@/components/icon";
import { friendlyFileLabel } from "@/lib/file-labels";
import {
  collapseContext,
  computeLineDiff,
  type DiffLine,
} from "@/lib/line-diff";

/**
 * GitHub-style before/after for files an AI session changed. Both sides come
 * from content-pilot's git clone (one commit per turn), so the view is the
 * same for Claude and Gemini sessions and never trusts the tool payloads.
 *
 * Two shapes share this file:
 *  - `FileDiffButton` — the per-step icon in the chat ("Editing x" rows and
 *    the "Saved to preview" row). One turn: parent of `to` vs `to`.
 *  - `DiffDialogBody` — the file list + diff pane, reused by the header
 *    "Changes" dialog for the whole session (merge-base vs head).
 */

export type DiffFile = { path: string; status?: "A" | "M" | "D" | "R" };

const pilotUrl = (process.env.NEXT_PUBLIC_CONTENT_PILOT_URL ?? "").replace(
  /\/+$/,
  ""
);

type FileDiffResponse = {
  path: string;
  before: string | null;
  after: string | null;
  truncated: boolean;
};

export const fetchFileDiff = async (params: {
  sessionId: string;
  editToken: string;
  to: string;
  from?: string | null;
  path: string;
}): Promise<FileDiffResponse> => {
  const search = new URLSearchParams({ to: params.to, path: params.path });
  if (params.from) search.set("from", params.from);
  const res = await fetch(
    `${pilotUrl}/api/v1/sessions/${params.sessionId}/diff?${search}`,
    { headers: { Authorization: `Bearer ${params.editToken}` } }
  );
  if (!res.ok) throw new Error(`diff ${res.status}`);
  return (await res.json()) as FileDiffResponse;
};

export function FileDiffButton({
  sessionId,
  editToken,
  to,
  files,
  title,
}: {
  sessionId: string;
  editToken: string;
  /** The turn's commit; before = its parent. */
  to: string;
  files: DiffFile[];
  title: string;
}) {
  const [open, setOpen] = useState(false);
  if (!files.length) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Show changes"
            className="text-muted-foreground/60 hover:text-foreground size-5 shrink-0"
          >
            <FileDiff className="size-3" />
          </Button>
        }
      />
      <DialogContent className="flex max-h-[85dvh] flex-col gap-3 p-0 sm:max-w-4xl">
        {open && (
          <DiffDialogBody
            sessionId={sessionId}
            editToken={editToken}
            to={to}
            files={files}
            title={title}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** File list + diff pane. Mounted only while a dialog is open. */
export function DiffDialogBody({
  sessionId,
  editToken,
  to,
  from,
  files,
  title,
  description,
}: {
  sessionId: string;
  editToken: string;
  to: string;
  from?: string | null;
  files: DiffFile[];
  title: string;
  description?: string;
}) {
  const [selected, setSelected] = useState(files[0]?.path ?? null);
  const current = files.find((file) => file.path === selected) ?? files[0];
  const multi = files.length > 1;
  return (
    <>
      <DialogHeader className="px-4 pt-4">
        <DialogTitle className="text-[15px]">{title}</DialogTitle>
        <DialogDescription className="text-[12px]">
          {description ??
            (multi
              ? `${files.length} files changed. Red lines were removed, green lines were added.`
              : "Red lines were removed, green lines were added.")}
        </DialogDescription>
      </DialogHeader>
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden border-t",
          multi && "sm:flex-row"
        )}
      >
        {multi && (
          <div className="flex max-h-40 shrink-0 flex-col overflow-y-auto border-b sm:max-h-none sm:w-56 sm:border-r sm:border-b-0">
            {files.map((file) => (
              <button
                key={file.path}
                type="button"
                onClick={() => setSelected(file.path)}
                className={cn(
                  "hover:bg-accent flex flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors",
                  current?.path === file.path && "bg-accent"
                )}
              >
                <span className="flex items-center gap-1.5 text-[12.5px] font-medium">
                  {friendlyFileLabel(file.path)}
                  <StatusBadge status={file.status} />
                </span>
                <span className="text-muted-foreground truncate text-[11px] [overflow-wrap:anywhere]">
                  {file.path}
                </span>
              </button>
            ))}
          </div>
        )}
        {current && (
          <FileDiffPane
            key={current.path}
            sessionId={sessionId}
            editToken={editToken}
            to={to}
            from={from}
            file={current}
          />
        )}
      </div>
    </>
  );
}

function StatusBadge({ status }: { status?: DiffFile["status"] }) {
  if (!status || status === "M") return null;
  return (
    <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal">
      {status === "A" ? "New" : status === "D" ? "Removed" : "Renamed"}
    </Badge>
  );
}

function FileDiffPane({
  sessionId,
  editToken,
  to,
  from,
  file,
}: {
  sessionId: string;
  editToken: string;
  to: string;
  from?: string | null;
  file: DiffFile;
}) {
  const query = useQuery({
    queryKey: ["preview-session-diff", sessionId, from ?? null, to, file.path],
    // Commits are immutable — a diff never changes once fetched.
    staleTime: Infinity,
    queryFn: () =>
      fetchFileDiff({ sessionId, editToken, to, from, path: file.path }),
  });
  const lines = useMemo<DiffLine[] | null>(() => {
    if (!query.data) return null;
    const before = query.data.before?.split("\n") ?? [];
    const after = query.data.after?.split("\n") ?? [];
    return collapseContext(computeLineDiff(before, after));
  }, [query.data]);
  const added = lines?.filter((line) => line.type === "add").length ?? 0;
  const removed = lines?.filter((line) => line.type === "del").length ?? 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-1.5 text-[11px]">
        <span className="text-muted-foreground truncate font-mono [overflow-wrap:anywhere]">
          {query.data?.path ?? file.path}
        </span>
        {lines && (
          <span className="ml-auto shrink-0 tabular-nums">
            <span className="text-green-700 dark:text-green-400">+{added}</span>{" "}
            <span className="text-red-700 dark:text-red-400">−{removed}</span>
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {query.isPending ? (
          <div className="flex flex-col gap-1.5 p-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : query.isError ? (
          <p className="text-destructive px-3 py-2 text-xs">
            Could not load this change.
          </p>
        ) : query.data.before === null && query.data.after === null ? (
          <p className="text-muted-foreground px-3 py-2 text-xs">
            This file is not in the preview anymore.
          </p>
        ) : (
          <>
            {query.data.before === null && (
              <p className="text-muted-foreground px-3 py-1.5 text-[11px]">
                New file
              </p>
            )}
            {query.data.after === null && (
              <p className="text-muted-foreground px-3 py-1.5 text-[11px]">
                File removed
              </p>
            )}
            <LineDiffView lines={lines ?? []} />
            {query.data.truncated && (
              <p className="text-muted-foreground px-3 py-1.5 text-[11px]">
                Large file — showing the first part only.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** `−`/`+` gutters, collapsed unchanged runs — the GitHub unified look. */
function LineDiffView({ lines }: { lines: DiffLine[] }) {
  if (lines.length === 0) {
    return (
      <p className="text-muted-foreground px-3 py-2 text-xs">(no changes)</p>
    );
  }
  return (
    <div className="font-mono text-[11.5px] leading-5">
      {lines.map((line, index) =>
        line.type === "gap" ? (
          <div
            key={index}
            className="bg-muted/40 text-muted-foreground px-3 py-0.5 text-center select-none"
          >
            ··· {line.hidden} unchanged {line.hidden === 1 ? "line" : "lines"}
          </div>
        ) : (
          <div
            key={index}
            className={cn(
              "flex gap-2 px-3",
              line.type === "del" &&
                "bg-red-500/10 text-red-700 dark:text-red-400",
              line.type === "add" &&
                "bg-green-500/10 text-green-700 dark:text-green-400",
              line.type === "context" && "text-muted-foreground"
            )}
          >
            <span className="w-3 shrink-0 select-none">
              {line.type === "del" ? "−" : line.type === "add" ? "+" : " "}
            </span>
            <span className="whitespace-pre">{line.text || " "}</span>
          </div>
        )
      )}
    </div>
  );
}
