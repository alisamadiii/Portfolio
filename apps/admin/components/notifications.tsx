import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";

import { queryClient, useTRPC } from "@workspace/trpc/client";
import {
  notificationStatusValues,
  projectsTypeValues,
} from "@workspace/drizzle/schema";

interface NotificationsProps {
  project: (typeof projectsTypeValues)[number];
  userId: string;
}
export const Notifications = ({ project, userId }: NotificationsProps) => {
  const trpc = useTRPC();
  const notifications = useQuery(
    trpc.admin.notification.sentNotifications.queryOptions({ project, userId })
  );
  const updateNotification = useMutation(
    trpc.admin.notification.updateNotification.mutationOptions()
  );

  return (
    notifications.data &&
    notifications.isSuccess && (
      <div className="space-y-2">
        {notifications.data.map((notification) => (
          <div
            key={notification.id}
            className={cn(
              "rounded-lg border p-4",
              notification.status === "PENDING"
                ? "border-yellow-500 bg-yellow-500/10"
                : notification.status === "SEEN_BY_ADMIN"
                  ? "border-blue-500 bg-blue-500/10"
                  : notification.status === "SEEN"
                    ? "border-blue-500 bg-blue-500/10"
                    : notification.status === "RESOLVED"
                      ? "border-green-500 bg-green-500/10"
                      : "border-red-500 bg-red-500/10"
            )}
          >
            <div>
              <h3>{notification.subject}</h3>
              <p>{notification.message}</p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Select
                value={notification.status ?? undefined}
                onValueChange={(value) => {
                  console.log(value);
                  updateNotification.mutate(
                    {
                      id: notification.id,
                      status:
                        value as (typeof notificationStatusValues)[number],
                    },
                    {
                      onSuccess: () => {
                        queryClient.invalidateQueries({
                          queryKey:
                            trpc.admin.notification.sentNotifications.queryKey({
                              project,
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
                  className="w-full"
                  disabled={updateNotification.isPending}
                >
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="SEEN_BY_ADMIN">Seen by admin</SelectItem>
                  <SelectItem value="SEEN">Seen</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>
    )
  );
};
