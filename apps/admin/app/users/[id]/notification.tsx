import React, { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  MessageSquare,
  RefreshCw,
  Shield,
  Shuffle,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";

import { queryClient, useTRPC } from "@workspace/trpc/client";
import {
  notificationPriorityValues,
  notificationStatusValues,
  notificationTypeValues,
  projectsTypeValues,
  type NotificationMetadata,
} from "@workspace/drizzle/schema";

// ─── Type helpers ───────────────────────────────────────────────────────────

type NotificationType = (typeof notificationTypeValues)[number];

type NotificationPriority = (typeof notificationPriorityValues)[number];

type NotificationStatus = (typeof notificationStatusValues)[number];

type ProjectType = (typeof projectsTypeValues)[number];

interface Notification {
  id: number;
  recipientId: string | null;
  projectType: ProjectType;
  actorId: string | null;
  type: NotificationType | null;
  priority: NotificationPriority;
  subject: string;
  message: string;
  metadata: NotificationMetadata | null;
  seenAt: string | null;
  status: NotificationStatus | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Config maps ────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  NotificationType,
  { label: string; icon: React.ElementType; color: string }
> = {
  SERVICE_CHANGE_REQUEST: {
    label: "Change Request",
    icon: Shuffle,
    color: "text-amber-500",
  },
  SERVICE_CHANGE_APPROVED: {
    label: "Change Approved",
    icon: CheckCircle2,
    color: "text-green-500",
  },
  SERVICE_CHANGE_REJECTED: {
    label: "Change Rejected",
    icon: AlertTriangle,
    color: "text-red-500",
  },
  CLIENT_MESSAGE: {
    label: "Client Message",
    icon: MessageSquare,
    color: "text-blue-500",
  },
  SYSTEM_ALERT: {
    label: "System Alert",
    icon: Shield,
    color: "text-orange-500",
  },
  PAYMENT_UPDATE: {
    label: "Payment",
    icon: CreditCard,
    color: "text-emerald-500",
  },
  ACCOUNT_DELETION_REQUEST: {
    label: "Deletion Request",
    icon: UserX,
    color: "text-red-600",
  },
};

const PRIORITY_CONFIG: Record<
  NotificationPriority,
  { label: string; className: string; dotColor: string }
> = {
  LOW: {
    label: "Low",
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    dotColor: "bg-slate-400",
  },
  MEDIUM: {
    label: "Medium",
    className: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    dotColor: "bg-blue-500",
  },
  HIGH: {
    label: "High",
    className:
      "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
    dotColor: "bg-orange-500",
  },
  URGENT: {
    label: "Urgent",
    className: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
    dotColor: "bg-red-500",
  },
};

const STATUS_CONFIG: Record<
  NotificationStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    className:
      "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40",
  },
  SEEN_BY_ADMIN: {
    label: "Seen by Admin",
    icon: Eye,
    className:
      "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40",
  },
  SEEN: {
    label: "Seen",
    icon: EyeOff,
    className:
      "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40",
  },
  RESOLVED: {
    label: "Resolved",
    icon: CheckCircle2,
    className:
      "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/40",
  },
};

const PROJECT_BADGE: Record<ProjectType, string> = {
  MOTION:
    "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  AGENCY: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  GLOBAL:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
};

// ─── Utility ────────────────────────────────────────────────────────────────

function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: diffDay > 365 ? "numeric" : undefined,
  });
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function NotificationTypeIcon({ type }: { type: NotificationType | null }) {
  if (!type) return <Bell className="text-muted-foreground size-4" />;
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;
  return <Icon className={cn("size-4", config.color)} />;
}

function PriorityBadge({ priority }: { priority: NotificationPriority }) {
  const config = PRIORITY_CONFIG[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        config.className
      )}
    >
      <span className={cn("size-1.5 rounded-full", config.dotColor)} />
      {config.label}
    </span>
  );
}

function StatusSelect({
  notificationId,
  currentStatus,
  userId,
}: {
  notificationId: number;
  currentStatus: NotificationStatus | null;
  userId: string;
}) {
  const trpc = useTRPC();
  const updateNotification = useMutation(
    trpc.admin.notification.updateNotification.mutationOptions()
  );

  return (
    <Select
      value={currentStatus ?? undefined}
      onValueChange={(value) => {
        updateNotification.mutate(
          {
            id: notificationId,
            status: value as NotificationStatus,
          },
          {
            onSuccess: () => {
              toast.success("Status updated");
              queryClient.invalidateQueries({
                queryKey: trpc.admin.notification.sentNotifications.queryKey({
                  userId,
                }),
              });
            },
            onError: (error) => {
              toast.error(error.message);
            },
          }
        );
      }}
    >
      <SelectTrigger
        className="h-8 w-[160px] text-xs"
        disabled={updateNotification.isPending}
      >
        {updateNotification.isPending ? (
          <Spinner className="size-3 animate-spin" />
        ) : (
          <SelectValue placeholder="Set status" />
        )}
      </SelectTrigger>
      <SelectContent>
        {notificationStatusValues.map((status) => {
          const config = STATUS_CONFIG[status];
          const Icon = config.icon;
          return (
            <SelectItem key={status} value={status}>
              <span className="flex items-center gap-2">
                <Icon className="size-3.5" />
                {config.label}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function NotificationCard({
  notification,
  userId,
}: {
  notification: Notification;
  userId: string;
}) {
  const statusConfig = notification.status
    ? STATUS_CONFIG[notification.status]
    : STATUS_CONFIG.PENDING;
  const typeConfig = notification.type ? TYPE_CONFIG[notification.type] : null;

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border p-4 transition-shadow hover:shadow-md",
        statusConfig.className
      )}
    >
      {/* Top row: type icon + badges + timestamp */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <NotificationTypeIcon type={notification.type} />
          {typeConfig && (
            <span className="text-muted-foreground text-xs font-medium">
              {typeConfig.label}
            </span>
          )}
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
              PROJECT_BADGE[notification.projectType]
            )}
          >
            {notification.projectType}
          </span>
        </div>
        <span className="text-muted-foreground shrink-0 text-xs">
          {formatRelativeTime(notification.createdAt)}
        </span>
      </div>

      {/* Subject + message */}
      <div className="space-y-1">
        <h3 className="text-sm leading-snug font-semibold">
          {notification.subject}
        </h3>
        <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
          {notification.message}
        </p>
      </div>

      {/* Metadata (if present) */}
      {notification.metadata &&
        Object.keys(notification.metadata).length > 0 && (
          <div className="rounded-lg bg-black/5 px-3 py-2 dark:bg-white/5">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {notification.metadata.changeType && (
                <span className="text-muted-foreground text-xs">
                  Change:{" "}
                  <span className="text-foreground font-medium">
                    {notification.metadata.changeType}
                  </span>
                </span>
              )}
              {notification.metadata.previousValue && (
                <span className="text-muted-foreground text-xs">
                  From:{" "}
                  <span className="text-foreground font-medium">
                    {notification.metadata.previousValue}
                  </span>
                </span>
              )}
              {notification.metadata.requestedValue && (
                <span className="text-muted-foreground text-xs">
                  To:{" "}
                  <span className="text-foreground font-medium">
                    {notification.metadata.requestedValue}
                  </span>
                </span>
              )}
            </div>
          </div>
        )}

      {/* Bottom row: priority + status select */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <PriorityBadge priority={notification.priority} />
        <StatusSelect
          notificationId={notification.id}
          currentStatus={notification.status}
          userId={userId}
        />
      </div>
    </div>
  );
}

// ─── Status summary pills ──────────────────────────────────────────────────

function StatusSummary({ notifications }: { notifications: Notification[] }) {
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of notifications) {
      const key = n.status ?? "PENDING";
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [notifications]);

  return (
    <div className="flex flex-wrap gap-2">
      {notificationStatusValues.map((status) => {
        const config = STATUS_CONFIG[status];
        const Icon = config.icon;
        const count = counts[status] ?? 0;
        return (
          <div
            key={status}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2",
              config.className
            )}
          >
            <Icon className="size-4" />
            <span className="text-sm font-medium">{config.label}</span>
            <span className="ml-1 text-lg font-bold">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

interface NotificationsProps {
  userId: string;
}

export const NotificationsTab = ({ userId }: NotificationsProps) => {
  const trpc = useTRPC();
  const notifications = useQuery(
    trpc.admin.notification.sentNotifications.queryOptions({ userId })
  );

  if (notifications.isPending) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Spinner className="size-6 animate-spin" />
      </div>
    );
  }

  if (notifications.isError) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-3">
        <AlertTriangle className="text-destructive size-8" />
        <p className="text-destructive text-sm">
          {notifications.error.message}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => notifications.refetch()}
        >
          <RefreshCw className="mr-2 size-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  if (notifications.data.length === 0) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-2">
        <Bell className="text-muted-foreground/40 size-10" />
        <p className="text-muted-foreground text-sm">No notifications found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <StatusSummary notifications={notifications.data as Notification[]} />
      <div
        className="grid w-full gap-4"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
        }}
      >
        {notifications.data.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            userId={userId}
          />
        ))}
      </div>
    </div>
  );
};
