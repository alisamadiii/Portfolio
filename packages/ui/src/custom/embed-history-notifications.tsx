import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";
import { RouterOutputs } from "@workspace/trpc/routers/_app";
import { projectsTypeValues } from "@workspace/drizzle/schema";

import { Badge } from "../components/badge";
import { Spinner } from "../components/spinner";
import { cn } from "../lib/utils";

interface EmbedHistoryNotificationsProps {
  project: (typeof projectsTypeValues)[number];
}

export const EmbedHistoryNotifications = ({
  project,
}: EmbedHistoryNotificationsProps) => {
  const trpc = useTRPC();
  const historyNotifications = useQuery(
    trpc.notification.history.queryOptions({ project })
  );

  return historyNotifications.isPending ? (
    <Spinner />
  ) : historyNotifications.isError ? (
    <p className="text-destructive">{historyNotifications.error.message}</p>
  ) : historyNotifications.data.length === 0 ? (
    <p className="text-muted-foreground">No notifications found</p>
  ) : (
    historyNotifications.data && (
      <div className="mb-8 space-y-4 px-4">
        {historyNotifications.data.map((notification) => (
          <EachNotifications
            key={notification.id}
            notification={notification}
          />
        ))}
      </div>
    )
  );
};

const EachNotifications = ({
  notification,
}: {
  notification: RouterOutputs["notification"]["sentNotifications"][number];
}) => {
  const trpc = useTRPC();
  useQuery(
    trpc.notification.seenNotifications.queryOptions(
      { recipientId: notification.id },
      {
        enabled: !!notification.id && notification.status === "RESOLVED",
      }
    )
  );

  return (
    <div
      key={notification.id}
      className="bg-muted flex items-start justify-between gap-4 rounded-xl border p-4"
    >
      <div>
        <code className="text-muted-foreground mb-4 inline-block text-xs">
          #{notification.id}
        </code>
        <p className="text-muted-foreground text-sm font-medium uppercase">
          {notification.subject}
        </p>
        <p>{notification.message}</p>
      </div>
      <Badge
        className={cn(
          notification.status === "RESOLVED"
            ? "bg-green-500 text-white"
            : notification.status === "SEEN_BY_ADMIN" ||
                notification.status === "SEEN"
              ? "bg-blue-500 text-white"
              : notification.status === "PENDING"
                ? "bg-yellow-500 text-black"
                : "bg-red-500 text-white"
        )}
      >
        {notification.status}
      </Badge>
    </div>
  );
};
