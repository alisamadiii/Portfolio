"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { RouterOutputs } from "@workspace/trpc/routers/_app";

type Notification = RouterOutputs["notification"]["history"][number];

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const trpc = useTRPC();

  const { data: notifications } = useQuery(
    trpc.notification.history.queryOptions()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <SidebarMenuItem>
          <SidebarMenuButton className="relative py-4">
            <Bell />
            <span>Notifications</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="end"
        sideOffset={8}
        className="w-80 gap-2 p-0"
      >
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
        </div>
        <div className="max-h-96 overflow-y-auto pb-8">
          {!notifications || notifications.length === 0 ? (
            <p className="text-muted-foreground px-4 py-6 text-center text-sm">
              No notifications yet
            </p>
          ) : (
            notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationItem({ notification: n }: { notification: Notification }) {
  return (
    <div className="flex gap-3 border-b px-4 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-medium">{n.subject}</p>
          <StatusBadge status={n.status} />
        </div>
        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
          {n.message}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
        </p>
        {n.status === "REPLIED" && (
          <a
            href={`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(n.id)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-600 transition-colors hover:bg-purple-500/20"
          >
            Find reply in inbox
          </a>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Notification["status"] }) {
  const cls = cn(
    "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
    status === "RESOLVED" && "bg-green-500/15 text-green-600",
    status === "SEEN_BY_ADMIN" && "bg-blue-500/15 text-blue-600",
    status === "SEEN" && "bg-blue-500/15 text-blue-600",
    status === "PENDING" && "bg-yellow-500/15 text-yellow-600",
    status === "REJECTED" && "bg-red-500/15 text-red-600",
    status === "REPLIED" && "bg-purple-500/15 text-purple-600"
  );
  return <span className={cls}>{status.replace("_", " ")}</span>;
}
