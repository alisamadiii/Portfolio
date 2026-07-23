"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { BookText, RefreshCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

import { requireApiSuccess } from "@/lib/api-client";

import { useRepoHeader } from "@/components/repo/repo-header-context";

type CacheStatusPayload = {
  fileMeta: {
    commitSha: string | null;
    status: string;
    error: string | null;
    updatedAt: string;
    lastCheckedAt: string;
  } | null;
  folderMeta: Array<{
    path: string;
    context: string;
    status: string;
    commitSha: string | null;
    updatedAt: string;
  }>;
  fileCount: number;
  permissionCount: number;
  config: {
    sha: string;
    lastCheckedAt: string;
    version: string;
  } | null;
  branchHeadSha: string;
};

function formatTimeAgo(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return formatDistanceToNow(date, { addSuffix: true });
}

function fullDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function TimeWithTooltip({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="font-medium">-</span>;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="cursor-help font-medium">
            {formatTimeAgo(value)}
          </span>
        }
      />
      <TooltipContent sideOffset={6}>{fullDate(value)}</TooltipContent>
    </Tooltip>
  );
}

function ConfirmActionButton({
  label,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "outline",
  size = "sm",
  iconOnly = false,
  tooltip,
  className,
  icon,
  disabled,
  onConfirm,
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  iconOnly?: boolean;
  tooltip?: string;
  className?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {iconOnly ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <AlertDialogTrigger
                render={
                  <Button
                    size={size}
                    variant={variant}
                    className={className}
                    disabled={disabled}
                    aria-label={label}
                  >
                    {icon ?? <Trash2 className="size-4" />}
                  </Button>
                }
              />
            }
          />
          <TooltipContent sideOffset={6}>{tooltip || label}</TooltipContent>
        </Tooltip>
      ) : (
        <AlertDialogTrigger
          render={
            <Button
              size={size}
              variant={variant}
              className={className}
              disabled={disabled}
            >
              {label}
            </Button>
          }
        />
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={() => {
              void onConfirm().finally(() => setOpen(false));
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CachePage({
  owner,
  repo,
  branch,
}: {
  owner: string;
  repo: string;
  branch: string;
}) {
  const [data, setData] = useState<CacheStatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/${owner}/${repo}/${encodeURIComponent(branch)}/cache`
      );
      const payload = await requireApiSuccess<{
        status: string;
        data: CacheStatusPayload;
      }>(response, "Failed to fetch cache status");
      setData(payload.data);
    } catch (error: any) {
      toast.error(error?.message || "Failed to fetch cache status");
    } finally {
      setLoading(false);
    }
  }, [branch, owner, repo]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const runAction = useCallback(
    async (action: string, successMessage: string) => {
      setActionLoading(action);
      const loadingId = toast.loading("Updating cache...");
      try {
        const response = await fetch(
          `/api/${owner}/${repo}/${encodeURIComponent(branch)}/cache`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          }
        );
        await requireApiSuccess(response, "Failed cache action");
        toast.success(successMessage, { id: loadingId });
        await fetchStatus();
      } catch (error: any) {
        toast.error(error?.message || "Failed cache action", { id: loadingId });
      } finally {
        setActionLoading(null);
      }
    },
    [branch, fetchStatus, owner, repo]
  );

  const headerNode = useMemo(
    () => (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Cache</h1>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  render={
                    <Link
                      href="https://pagescms.org/docs/development/caching/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <BookText />
                      <span className="sr-only">Cache docs</span>
                    </Link>
                  }
                />
              }
            />
            <TooltipContent>View docs</TooltipContent>
          </Tooltip>
        </div>
        <ConfirmActionButton
          label="Clear all cache"
          title="Clear all cache?"
          description="This will clear file, config, and permission cache for this repository/branch."
          confirmLabel="Clear all"
          variant="default"
          size="default"
          disabled={loading || actionLoading != null}
          onConfirm={async () =>
            runAction("clear-all-cache", "All cache cleared")
          }
        />
      </div>
    ),
    [actionLoading, loading, runAction]
  );

  useRepoHeader({ header: headerNode });

  const remoteSha = data?.branchHeadSha ?? null;
  const localSha = data?.fileMeta?.commitSha ?? null;
  const isOutOfSync = !!remoteSha && !!localSha && remoteSha !== localSha;
  const canReconcile = !!data && isOutOfSync;
  const shortSha = (sha: string | null | undefined) =>
    sha ? sha.slice(0, 8) : "-";

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-screen-lg space-y-6">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="bg-background shadow-xs h-full gap-4 rounded-xl border py-5 ring-0 md:py-6">
            <CardHeader className="px-5 md:px-6">
              <CardTitle className="text-sm font-semibold">Content</CardTitle>
              <CardDescription>
                Cached content (files and collections).
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 px-5 text-sm md:px-6">
              <div className="divide-y rounded-md border">
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Files cached</span>
                  <Skeleton className="h-4 w-10" />
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Folder caches</span>
                  <Skeleton className="h-4 w-10" />
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Cache SHA</span>
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Remote SHA</span>
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Updated</span>
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Status</span>
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Last checked</span>
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end px-5 md:px-6">
              <div className="inline-flex items-center">
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="rounded-r-none"
                  disabled
                >
                  <RefreshCcw className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="rounded-l-none border-l-0"
                  disabled
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>

          <div className="space-y-5">
            <Card className="bg-background shadow-xs gap-4 rounded-xl border py-5 ring-0 md:py-6">
              <CardHeader className="px-5 md:px-6">
                <CardTitle className="text-sm font-semibold">Config</CardTitle>
                <CardDescription>
                  Cache of the configuration file (
                  <code className="text-[13px]">.pages.yml</code>).
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 px-5 text-sm md:px-6">
                <div className="divide-y rounded-md border">
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-muted-foreground">Cache SHA</span>
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-muted-foreground">Version</span>
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-muted-foreground">Last checked</span>
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end px-5 md:px-6">
                <div className="inline-flex items-center">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="rounded-r-none"
                    disabled
                  >
                    <RefreshCcw className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="rounded-l-none border-l-0"
                    disabled
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>

            <Card className="bg-background shadow-xs gap-4 rounded-xl border py-5 ring-0 md:py-6">
              <CardHeader className="px-5 md:px-6">
                <CardTitle className="text-sm font-semibold">Permissions</CardTitle>
                <CardDescription>
                  Cached repository permission checks.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 px-5 text-sm md:px-6">
                <div className="divide-y rounded-md border">
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-muted-foreground">Entries</span>
                    <Skeleton className="h-4 w-10" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end px-5 md:px-6">
                <Button variant="outline" size="icon-sm" disabled>
                  <Trash2 className="size-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-screen-lg space-y-6">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="bg-background shadow-xs h-full gap-4 rounded-xl border py-5 ring-0 md:py-6">
            <CardHeader className="px-5 md:px-6">
              <CardTitle className="text-sm font-semibold">Content</CardTitle>
              <CardDescription>
                Cached content (files and collections).
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 px-5 text-sm md:px-6">
              <div className="divide-y rounded-md border">
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Files cached</span>
                  <span className="font-medium">{data.fileCount}</span>
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Folder caches</span>
                  <span className="font-medium">{data.folderMeta.length}</span>
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Cache SHA</span>
                  <span className="font-mono font-medium">
                    {shortSha(localSha)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Remote SHA</span>
                  <span className="font-mono font-medium">
                    {shortSha(remoteSha)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Updated</span>
                  <TimeWithTooltip value={data.fileMeta?.updatedAt} />
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">
                    {data.fileMeta?.status || "unknown"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Last checked</span>
                  <TimeWithTooltip value={data.fileMeta?.lastCheckedAt} />
                </div>
              </div>
              {data.fileMeta?.status === "error" && (
                <div className="border-destructive/40 bg-destructive/10 mt-4 rounded-md border px-3 py-3 text-sm">
                  <p className="text-destructive font-medium">
                    Unknown cache error
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Try refreshing the cache first. If the issue persists, clear
                    the cache and refresh it again.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end px-5 md:px-6">
              <div className="inline-flex items-center">
                <ConfirmActionButton
                  label="Refresh cache"
                  title="Refresh file cache?"
                  description="This will check remote SHA and reconcile file cache if needed."
                  confirmLabel="Refresh"
                  variant="outline"
                  size="icon-sm"
                  iconOnly
                  tooltip="Refresh cache"
                  icon={<RefreshCcw className="size-4" />}
                  className="rounded-r-none"
                  disabled={actionLoading != null || !canReconcile}
                  onConfirm={async () =>
                    runAction("reconcile-file-cache", "File cache refreshed")
                  }
                />
                <ConfirmActionButton
                  label="Clear cache"
                  title="Clear file cache?"
                  description="This will delete cached file entries and reset file cache metadata."
                  confirmLabel="Clear"
                  variant="outline"
                  size="icon-sm"
                  iconOnly
                  tooltip="Clear cache"
                  icon={<Trash2 className="size-4" />}
                  className="rounded-l-none border-l-0"
                  disabled={actionLoading != null}
                  onConfirm={async () =>
                    runAction("clear-file-cache", "File cache cleared")
                  }
                />
              </div>
            </CardFooter>
          </Card>

          <div className="space-y-5">
            <Card className="bg-background shadow-xs gap-4 rounded-xl border py-5 ring-0 md:py-6">
              <CardHeader className="px-5 md:px-6">
                <CardTitle className="text-sm font-semibold">Config</CardTitle>
                <CardDescription>
                  Cache of the configuration file (
                  <code className="text-[13px]">.pages.yml</code>).
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 px-5 text-sm md:px-6">
                <div className="divide-y rounded-md border">
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-muted-foreground">Cache SHA</span>
                    <span className="font-mono font-medium">
                      {shortSha(data.config?.sha)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-muted-foreground">Version</span>
                    <span className="font-medium">
                      {data.config?.version || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-muted-foreground">Last checked</span>
                    <TimeWithTooltip value={data.config?.lastCheckedAt} />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end px-5 md:px-6">
                <div className="inline-flex items-center">
                  <ConfirmActionButton
                    label="Refresh cache"
                    title="Refresh config cache?"
                    description="This will refetch and revalidate the cached configuration."
                    confirmLabel="Refresh"
                    variant="outline"
                    size="icon-sm"
                    iconOnly
                    tooltip="Refresh cache"
                    icon={<RefreshCcw className="size-4" />}
                    className="rounded-r-none"
                    disabled={actionLoading != null}
                    onConfirm={async () =>
                      runAction("refresh-config", "Config cache refreshed")
                    }
                  />
                  <ConfirmActionButton
                    label="Clear cache"
                    title="Clear config cache?"
                    description="This will remove cached config for this repository/branch."
                    confirmLabel="Clear"
                    variant="outline"
                    size="icon-sm"
                    iconOnly
                    tooltip="Clear cache"
                    icon={<Trash2 className="size-4" />}
                    className="rounded-l-none border-l-0"
                    disabled={actionLoading != null}
                    onConfirm={async () =>
                      runAction("clear-config-cache", "Config cache cleared")
                    }
                  />
                </div>
              </CardFooter>
            </Card>

            <Card className="bg-background shadow-xs gap-4 rounded-xl border py-5 ring-0 md:py-6">
              <CardHeader className="px-5 md:px-6">
                <CardTitle className="text-sm font-semibold">Permissions</CardTitle>
                <CardDescription>
                  Cached repository permission checks.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 px-5 text-sm md:px-6">
                <div className="divide-y rounded-md border">
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-muted-foreground">Entries</span>
                    <span className="font-medium">{data.permissionCount}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end px-5 md:px-6">
                <ConfirmActionButton
                  label="Clear cache"
                  title="Clear permission cache?"
                  description="This will remove cached permission entries for this repository."
                  confirmLabel="Clear"
                  variant="outline"
                  size="icon-sm"
                  iconOnly
                  tooltip="Clear cache"
                  icon={<Trash2 className="size-4" />}
                  disabled={actionLoading != null}
                  onConfirm={async () =>
                    runAction(
                      "clear-permission-cache",
                      "Permission cache cleared"
                    )
                  }
                />
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
