"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { Bot, Eye, EyeOff, FileIcon, Loader2 } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Spinner } from "@workspace/ui/components/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { DataTable } from "@workspace/ui/custom/data-table";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

type Task = RouterOutputs["clickup"]["getTasks"]["tasks"][number];

const CLICKUP_FORM_URL =
  "https://forms.clickup.com/90141012131/f/2kyd5c53-274/29BFCEPFWYVA2TSXM4";

const TYPE_OPTIONS = [
  "Bug",
  "Content Update",
  "New Feature",
  "Design Change",
  "SEO",
  "Integration",
  "Security",
  "Other",
];

export default function RequestsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const isClient =
    (user.data?.user as { isClient?: boolean })?.isClient === true;
  const tasksQuery = useQuery({
    ...trpc.clickup.getTasks.queryOptions(),
    enabled: isClient,
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const updateStatus = useMutation(
    trpc.clickup.updateTaskStatus.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.clickup.getTasks.queryKey(),
        });
      },
    })
  );

  const columns: ColumnDef<Task>[] = [
    {
      header: "Description",
      accessorKey: "description",
      cell: ({ row }) => (
        <p
          className="max-w-74 text-sm"
          style={{ wordBreak: "break-word", whiteSpace: "normal" }}
        >
          {row.original.description || row.original.name}
        </p>
      ),
    },
    {
      header: "Type",
      accessorKey: "type",
      cell: ({ row }) => {
        const type = row.original.type.toLowerCase();
        const typeStyles: Record<string, string> = {
          bug: "bg-red-500/15 text-red-500",
          "content update": "bg-amber-500/15 text-amber-500",
          "new feature": "bg-purple-500/15 text-purple-500",
          "design change": "bg-blue-500/15 text-blue-500",
          seo: "bg-green-500/15 text-green-500",
          integration: "bg-teal-500/15 text-teal-500",
          security: "bg-rose-500/15 text-rose-500",
          other: "bg-zinc-500/15 text-zinc-400",
        };
        return (
          <span
            className={`inline-flex rounded px-2 py-0.5 text-xs font-medium capitalize ${typeStyles[type] ?? "bg-muted text-muted-foreground"}`}
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
        const statusStyles: Record<string, string> = {
          open: "bg-blue-500/15 text-blue-500",
          "to do": "bg-blue-500/15 text-blue-500",
          "in progress": "bg-yellow-500/15 text-yellow-500",
          review: "bg-purple-500/15 text-purple-500",
          "in review": "bg-purple-500/15 text-purple-500",
          closed: "bg-zinc-500/15 text-zinc-400",
          done: "bg-green-500/15 text-green-500",
          complete: "bg-green-500/15 text-green-500",
          ignored: "bg-red-500/15 text-red-500",
        };
        return (
          <span
            className={`inline-flex rounded px-2 py-0.5 text-xs font-medium uppercase ${statusStyles[status] ?? "bg-muted text-muted-foreground"}`}
            style={
              !statusStyles[status]
                ? {
                    backgroundColor: `${row.original.statusColor}20`,
                    color: row.original.statusColor,
                  }
                : undefined
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
            {row.original.files.map(
              (file: Task["files"][number], i: number) => (
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
                      className="size-8 rounded border object-cover"
                    />
                  ) : (
                    <div className="bg-muted flex size-8 items-center justify-center rounded border">
                      <FileIcon className="text-muted-foreground size-4" />
                    </div>
                  )}
                </a>
              )
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      header: "Date",
      accessorKey: "createdAt",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
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
        const isPending =
          updateStatus.isPending &&
          updateStatus.variables?.taskId === row.original.id;

        return (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className={
                    isIgnored
                      ? "text-blue-500 hover:text-blue-600"
                      : canAct
                        ? "text-muted-foreground hover:text-red-500"
                        : "text-muted-foreground/40"
                  }
                  disabled={!canAct || isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateStatus.mutate({
                      taskId: row.original.id,
                      status: isIgnored ? "TO DO" : "IGNORED",
                    });
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

  const tasks = tasksQuery.data?.tasks ?? [];

  const statusOptions = useMemo(
    () => [...new Set(tasks.map((t) => t.status))],
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (typeFilter !== "all") {
      result = result.filter((t) => t.type === typeFilter);
    }
    return result.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  }, [tasks, statusFilter, typeFilter]);

  const formUrl =
    CLICKUP_FORM_URL && user.data
      ? `${CLICKUP_FORM_URL}?User%20Id%20(Don't%20update)=${encodeURIComponent(user.data.user.id)}&Priority=2&Type=Bug&Status=TO%20DO`
      : CLICKUP_FORM_URL;

  if (user.isPending) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (user.data && !isClient) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground text-lg">
          This page is only available to active clients.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {/* Submit Request via ClickUp Form */}
      <section className="space-y-6">
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold">Request a Change</h2>
          <p className="text-muted-foreground max-w-2xl text-base">
            Need something updated on your website? Report a bug, request a new
            feature, or ask for content changes. Describe what you need and our
            AI assistant will handle it automatically — no waiting, no back and
            forth.
          </p>
          <p className="text-muted-foreground max-w-2xl text-sm">
            You can include screenshots or images to help explain what you need.
            Just attach them in the form below.
          </p>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Changes are not applied instantly. Every day at 8:00 AM PST, our AI
            processes all pending requests and generates a preview. At 8:30 AM,
            each change is manually reviewed — once approved, it goes live to
            production.
          </p>
        </div>

        {formUrl ? (
          <Dialog>
            <DialogTrigger render={<Button size="lg" />}>
              <Bot className="mr-2 size-5" />
              Submit a Request
            </DialogTrigger>
            <DialogContent className="md:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Submit a Request</DialogTitle>
                <DialogDescription>
                  Describe the change you want in plain language. Be specific —
                  mention which page, section, or element needs updating.
                  Include screenshots if possible.
                </DialogDescription>
              </DialogHeader>
              <iframe
                key={formUrl}
                src={formUrl}
                width="100%"
                height="600"
                className="rounded-md"
                style={{ border: "none" }}
              />
            </DialogContent>
          </Dialog>
        ) : (
          <p className="text-muted-foreground text-sm">
            Request form is not configured yet.
          </p>
        )}
      </section>

      {/* Request History */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-semibold">Request History</h2>
          <div className="ml-auto flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v ?? "all")}
            >
              <SelectTrigger className="w-[150px] capitalize">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v ?? "all")}
            >
              <SelectTrigger className="w-[170px] capitalize">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TooltipProvider delay={0}>
          <DataTable
            columns={columns}
            data={filteredTasks}
            isLoading={tasksQuery.isPending}
            error={tasksQuery.error}
          />
        </TooltipProvider>
      </section>
    </div>
  );
}
