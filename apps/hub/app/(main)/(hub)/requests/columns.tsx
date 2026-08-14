"use client";

import { ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { Eye, EyeOff, FileIcon, Loader2 } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

import type { RouterOutputs } from "@workspace/trpc/routers/_app";

export type Task = RouterOutputs["clickup"]["getTasks"]["tasks"][number];

const TYPE_PILL: Record<string, string> = {
  bug: "bg-status-danger-bg text-status-danger",
  "content update": "bg-status-warning-bg text-status-warning",
  "new feature": "bg-status-review-bg text-status-review",
  "design change": "bg-status-info-bg text-status-info",
  seo: "bg-status-success-bg text-status-success",
  integration: "bg-status-info-bg text-status-info",
  security: "bg-status-danger-bg text-status-danger",
  other: "bg-status-neutral-bg text-status-neutral",
};

const STATUS_PILL: Record<string, string> = {
  open: "bg-status-info-bg text-status-info",
  "to do": "bg-status-info-bg text-status-info",
  "in progress": "bg-status-warning-bg text-status-warning",
  review: "bg-status-review-bg text-status-review",
  "in review": "bg-status-review-bg text-status-review",
  closed: "bg-status-neutral-bg text-status-neutral",
  done: "bg-status-success-bg text-status-success",
  complete: "bg-status-success-bg text-status-success",
  ignored: "bg-status-danger-bg text-status-danger",
};

export const getColumns = ({
  onToggleIgnored,
  pendingTaskId,
}: {
  onToggleIgnored: (task: Task) => void;
  pendingTaskId?: string;
}): ColumnDef<Task>[] => [
  {
    header: "Description",
    accessorKey: "description",
    cell: ({ row }) => (
      <p className="max-w-74 pr-3.5 text-sm font-semibold wrap-break-word whitespace-normal">
        {row.original.description || row.original.name}
      </p>
    ),
  },
  {
    header: "Type",
    accessorKey: "type",
    cell: ({ row }) => {
      const type = row.original.type.toLowerCase();
      return (
        <span
          className={cn(
            "inline-flex rounded-full px-3 py-1 text-[12.5px] font-semibold capitalize",
            TYPE_PILL[type] ?? "bg-status-neutral-bg text-status-neutral"
          )}
        >
          {row.original.type}
        </span>
      );
    },
  },
  {
    header: "Status",
    accessorKey: "status",
    cell: ({ row }) => {
      const status = row.original.status.toLowerCase();
      const known = STATUS_PILL[status];
      return (
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[0.03em] uppercase",
            known ?? "bg-muted text-muted-foreground"
          )}
          style={
            known
              ? undefined
              : {
                  backgroundColor: `${row.original.statusColor}20`,
                  color: row.original.statusColor,
                }
          }
        >
          {row.original.status}
        </span>
      );
    },
  },
  {
    header: "Files",
    id: "files",
    cell: ({ row }) =>
      row.original.files.length > 0 ? (
        <div className="flex items-center gap-2">
          {row.original.files.map((file: Task["files"][number], i: number) => (
            <a
              key={i}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              title={file.name}
              onClick={(e) => e.stopPropagation()}
            >
              {file.thumbnail ? (
                <img
                  src={file.thumbnail}
                  alt={file.name}
                  className="size-8 rounded-[8px] border object-cover"
                />
              ) : (
                <div className="bg-muted flex size-8 items-center justify-center rounded-[8px] border">
                  <FileIcon className="text-muted-foreground size-4" />
                </div>
              )}
            </a>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      ),
  },
  {
    header: "Date",
    accessorKey: "createdAt",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-[13px]">
        {formatDistanceToNow(new Date(Number(row.original.createdAt)), {
          addSuffix: true,
        })}
      </span>
    ),
  },
  {
    header: "",
    id: "actions",
    cell: ({ row }) => {
      const status = row.original.status.toLowerCase();
      const isIgnored = status === "ignored";
      const isTodo = status === "to do";
      const canAct = isIgnored || isTodo;
      const isPending = pendingTaskId === row.original.id;

      return (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-full",
                  isIgnored && "text-status-info hover:text-status-info",
                  !isIgnored &&
                    canAct &&
                    "text-muted-foreground hover:text-destructive",
                  !canAct && "text-muted-foreground/40"
                )}
                disabled={!canAct || isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleIgnored(row.original);
                }}
              />
            }
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isIgnored ? (
              <Eye className="size-4" />
            ) : (
              <EyeOff className="size-4" />
            )}
          </TooltipTrigger>
          <TooltipContent side="top">
            {isIgnored
              ? "Restore to To Do — AI will process this request"
              : canAct
                ? "Mark as ignored — AI won't process this request"
                : "Can only ignore tasks in To Do status"}
          </TooltipContent>
        </Tooltip>
      );
    },
  },
];
