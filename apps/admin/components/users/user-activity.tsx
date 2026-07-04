"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Activity, AlertCircle, CircleCheck } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { CardAgency } from "@workspace/ui/agency/card-agency";

import { useTRPC } from "@workspace/trpc/client";

export function UserActivity({ userId }: { userId: string }) {
  const trpc = useTRPC();
  const { data: logs, isLoading } = useQuery(
    trpc.logs.list.queryOptions({ userId, limit: 50 })
  );

  return (
    <CardAgency.Card>
      <CardAgency.Header title="Activity Log">
        {logs && <Badge variant="secondary">{logs.length}</Badge>}
      </CardAgency.Header>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : !logs || logs.length === 0 ? (
        <div className="py-8 text-center">
          <Activity className="text-muted-foreground mx-auto mb-2 size-8 opacity-40" />
          <p className="text-muted-foreground text-sm">
            No activity recorded for this user.
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {logs.map((log) => {
            const isFailed = log.status === "failed";
            const StatusIcon = isFailed ? AlertCircle : CircleCheck;
            const statusColors = isFailed
              ? { bg: "bg-red-500/10", text: "text-red-500" }
              : { bg: "bg-emerald-500/10", text: "text-emerald-500" };
            return (
              <div
                key={log.id}
                className={cn(
                  "flex gap-3 py-3",
                  isFailed && "bg-red-50 dark:bg-red-950/20 -mx-4 px-4 rounded-lg"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                    statusColors.bg
                  )}
                >
                  <StatusIcon className={cn("size-3.5", statusColors.text)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{log.summary ?? "No summary"}</p>
                  <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                    <span className="capitalize">{log.type.replace("_", " ")}</span>
                    <span>
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  {isFailed && log.error && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {log.error}
                    </p>
                  )}
                </div>
                <Badge
                  className={cn(
                    "mt-0.5 h-5 self-start text-[10px] border-0",
                    isFailed
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  )}
                >
                  {log.status}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </CardAgency.Card>
  );
}
