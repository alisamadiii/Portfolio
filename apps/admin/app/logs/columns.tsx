"use client";

import { useState } from "react";
import type { ActivityLogMetadataMap } from "@workspace/drizzle/schema";

type EmailLogMetadata = ActivityLogMetadataMap["email"];
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { queryClient, useTRPC } from "@workspace/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { Copy, MoreHorizontal, Trash } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

type LogFromAPI = RouterOutputs["logs"]["list"][number];

export const columns: ColumnDef<LogFromAPI>[] = [
  {
    id: "user",
    header: "",
    cell: ({ row }) =>
      row.original.userImage ? (
        <img
          src={row.original.userImage}
          alt={row.original.userName ?? ""}
          className="size-7 rounded-full object-cover"
        />
      ) : row.original.userId ? (
        <div className="bg-muted text-muted-foreground flex size-7 items-center justify-center rounded-full text-xs font-medium">
          {row.original.userName?.[0]?.toUpperCase() ?? "?"}
        </div>
      ) : null,
    size: 40,
  },
  {
    header: "Type",
    cell: ({ row }) => {
      const typeClass =
        row.original.type === "email"
          ? "rounded bg-green-500/15 px-2 py-0.5 text-xs text-green-500 uppercase"
          : row.original.type === "contact"
            ? "rounded bg-orange-500/15 px-2 py-0.5 text-xs text-orange-500 uppercase"
            : "rounded bg-blue-500/15 px-2 py-0.5 text-xs text-blue-500 uppercase";
      return <span className={typeClass}>{row.original.type}</span>;
    },
  },
  {
    header: "Summary",
    cell: ({ row }) => {
      const meta = row.original.metadata as EmailLogMetadata | null;
      return (
        <div className="flex flex-col">
          <span className="text-foreground text-sm">
            {row.original.summary}
          </span>
          {meta && "to" in meta && (
            <span className="text-muted-foreground text-xs">{meta.to}</span>
          )}
        </div>
      );
    },
  },
  {
    header: "Status",
    cell: ({ row }) => (
      <span
        className={
          row.original.status === "success"
            ? "rounded bg-green-500/15 px-2 py-0.5 text-xs text-green-500"
            : "text-destructive bg-destructive/15 rounded px-2 py-0.5 text-xs"
        }
      >
        {row.original.status}
      </span>
    ),
  },
  {
    header: "Error",
    cell: ({ row }) =>
      row.original.error ? (
        <span className="text-destructive text-xs">{row.original.error}</span>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      ),
  },
  {
    header: "Date",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {formatDistanceToNow(
          typeof row.original.createdAt === "string"
            ? new Date(row.original.createdAt)
            : row.original.createdAt,
          { addSuffix: true }
        )}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionCell log={row.original} />,
  },
];

const ActionCell = ({ log }: { log: LogFromAPI }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const trpc = useTRPC();

  const deleteLog = useMutation(
    trpc.logs.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Log entry deleted");
        queryClient.invalidateQueries({
          queryKey: trpc.logs.list.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.logs.count.queryKey(),
        });
      },
    })
  );

  return (
    <div className="flex justify-end">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent
          align="end"
          className="w-48"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(log.id);
                toast.success("ID copied to clipboard");
                setIsOpen(false);
              }}
            >
              <Copy /> Copy ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                setDeleteOpen(true);
                setIsOpen(false);
              }}
            >
              <Trash /> Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete log entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this log entry? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteLog.isPending}
              onClick={() =>
                deleteLog.mutate(log.id, {
                  onSuccess: () => setDeleteOpen(false),
                })
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
