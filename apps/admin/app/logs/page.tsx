"use client";

import { Suspense, useEffect, useState } from "react";
import type { ActivityLogMetadataMap } from "@workspace/drizzle/schema";

type EmailLogMetadata = ActivityLogMetadataMap["email"];
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { queryClient, useTRPC } from "@workspace/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Separator } from "@workspace/ui/components/separator";
import { DataTable } from "@workspace/ui/custom/data-table";

import { columns } from "./columns";

type LogFromAPI = RouterOutputs["logs"]["list"][number];

const typeOptions = [
  { label: "All Types", value: "" },
  { label: "Email", value: "email" },
  { label: "Data Change", value: "data_change" },
  { label: "Contact", value: "contact" },
] as const;

const statusOptions = [
  { label: "All Status", value: "" },
  { label: "Success", value: "success" },
  { label: "Failed", value: "failed" },
] as const;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const LogsPage = () => {
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [limit, setLimit] = useQueryState(
    "limit",
    parseAsInteger.withDefault(20)
  );
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("")
  );
  const [typeFilter, setTypeFilter] = useQueryState(
    "type",
    parseAsString.withDefault("")
  );
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsString.withDefault("")
  );

  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);

  const trpc = useTRPC();

  const filterInput = {
    page,
    limit,
    type: (typeFilter || undefined) as
      | "email"
      | "data_change"
      | "contact"
      | undefined,
    status: (statusFilter || undefined) as "success" | "failed" | undefined,
    search: search || undefined,
  };

  const {
    data: logs,
    isPending,
    error,
    refetch,
  } = useQuery({
    ...trpc.logs.list.queryOptions(filterInput),
    refetchInterval: 60_000,
  });

  const { data: logsCount } = useQuery({
    ...trpc.logs.count.queryOptions({
      type: filterInput.type,
      status: filterInput.status,
      search: filterInput.search,
    }),
    refetchInterval: 60_000,
  });

  const { data: tableSize } = useQuery({
    ...trpc.logs.tableSize.queryOptions(),
    refetchInterval: 60_000,
  });

  const { data: purgePreview } = useQuery({
    ...trpc.logs.purgePreview.queryOptions(),
    enabled: purgeOpen,
  });

  const { data: selectedLog } = useQuery({
    ...trpc.logs.get.queryOptions(selectedLogId!),
    enabled: !!selectedLogId,
  });

  const purgeMutation = useMutation(
    trpc.logs.purge.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: trpc.logs.list.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.logs.count.queryKey() });
        setPurgeOpen(false);
      },
    })
  );

  useEffect(() => {
    if (search.length > 0) {
      setPage(1);
    }
  }, [search, setPage]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastRefresh) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastRefresh]);

  const handleRefresh = () => {
    refetch();
    setLastRefresh(Date.now());
    setSecondsAgo(0);
  };

  const totalCount = logsCount?.[0]?.count ?? 0;
  const totalPages = Math.ceil(totalCount / limit);

  const table = useReactTable<LogFromAPI>({
    data: logs || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize: limit,
      },
    },
  });

  return (
    <div className="mx-auto max-w-[1400px] p-4 font-mono md:p-8">
      <div className="bg-background rounded-xl border p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-foreground text-lg font-bold">Activity Logs</h2>
            <p className="text-muted-foreground text-xs">
              Last refreshed: {secondsAgo}s ago
              {tableSize &&
                ` · Table size: ${formatBytes(tableSize.sizeBytes)}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw size={14} />
              Refresh
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setPurgeOpen(true)}
            >
              <Trash2 size={14} />
              Purge Old Logs
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex items-center gap-2">
          <div className="relative w-full max-w-56">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline">
                  {typeOptions.find((o) => o.value === typeFilter)?.label ??
                    "All Types"}
                  <ChevronDown className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent className="w-40" align="start">
              {typeOptions.map((item) => (
                <DropdownMenuItem
                  key={item.value}
                  onClick={() => {
                    setTypeFilter(item.value);
                    setPage(1);
                  }}
                  data-checked={typeFilter === item.value}
                  className="cursor-pointer text-sm"
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline">
                  {statusOptions.find((o) => o.value === statusFilter)?.label ??
                    "All Status"}
                  <ChevronDown className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent className="w-40" align="start">
              {statusOptions.map((item) => (
                <DropdownMenuItem
                  key={item.value}
                  onClick={() => {
                    setStatusFilter(item.value);
                    setPage(1);
                  }}
                  data-checked={statusFilter === item.value}
                  className="cursor-pointer text-sm"
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Table */}
        <DataTable
          isLoading={isPending}
          table={table}
          error={error}
          onRowClick={(row) => {
            setSelectedLogId(row.original.id);
            setPreviewOpen(true);
          }}
        />

        {/* Pagination */}
        {search.length === 0 && (
          <div className="text-muted-foreground mt-4 flex items-center justify-between text-xs">
            <div className="flex items-center">
              {page * limit - limit + 1}-{Math.min(page * limit, totalCount)}{" "}
              of {totalCount}
              <Separator className="mx-2 h-5!" orientation="vertical" />
              Rows
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" size="sm" className="ml-2">
                      {limit} <ChevronDown className="size-3" />
                    </Button>
                  }
                />
                <DropdownMenuContent className="min-w-20">
                  {[20, 50, 100].map((item) => (
                    <DropdownMenuItem
                      key={item}
                      onClick={() => {
                        setLimit(item);
                        setPage(1);
                      }}
                      data-checked={limit === item}
                    >
                      {item}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft />
              </Button>
              <p className="mx-2 tabular-nums">
                <span className="text-foreground">{page}</span> / {totalPages}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Log Detail Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedLog
                ? ((selectedLog.metadata as EmailLogMetadata)?.subject ??
                  "Log Details")
                : "Loading..."}
            </DialogTitle>
            <DialogDescription>
              {selectedLog && (
                <span>
                  {(selectedLog.metadata as EmailLogMetadata)?.to &&
                    `To: ${(selectedLog.metadata as EmailLogMetadata).to} · `}
                  Status: {selectedLog.status}
                  {selectedLog.error && ` · Error: ${selectedLog.error}`}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (selectedLog.metadata as EmailLogMetadata)?.html ? (
            <iframe
              srcDoc={(selectedLog.metadata as EmailLogMetadata).html}
              className="h-[500px] w-full rounded border"
              sandbox=""
              title="Email preview"
            />
          ) : selectedLog ? (
            <pre className="text-muted-foreground overflow-auto rounded border p-4 text-xs">
              {JSON.stringify(selectedLog.metadata, null, 2)}
            </pre>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Purge Dialog */}
      <AlertDialog open={purgeOpen} onOpenChange={setPurgeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>Purge old logs</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all log entries older than 30 days.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {purgePreview && (
            <div className="bg-muted rounded-lg border p-4 text-sm">
              <p className="text-foreground mb-3 font-bold">
                {purgePreview.total} log entries to delete
              </p>
              {purgePreview.breakdown.length > 0 ? (
                <div className="space-y-1">
                  {purgePreview.breakdown.map((row, i) => (
                    <div
                      key={i}
                      className="text-muted-foreground flex justify-between text-xs"
                    >
                      <span>
                        {row.type} / {row.status}
                      </span>
                      <span
                        className={
                          row.status === "failed"
                            ? "text-destructive"
                            : "text-green-500"
                        }
                      >
                        {row.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  No logs older than 30 days
                </p>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={
                purgeMutation.isPending || (purgePreview?.total ?? 0) === 0
              }
              onClick={() => purgeMutation.mutate()}
            >
              Purge {purgePreview?.total ?? 0} entries
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LogsPage />
    </Suspense>
  );
}
