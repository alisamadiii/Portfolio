import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { useTRPC } from "@workspace/trpc/client";
import { RouterOutputs } from "@workspace/trpc/routers/_app";
import { ProjectType } from "@workspace/drizzle/schema";

import { Badge } from "../components/badge";
import { Spinner } from "../components/spinner";
import { cn } from "../lib/utils";

interface EmbedHistoryNotificationsProps {
  project: ProjectType;
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
      className="bg-muted space-y-4 rounded-xl border p-4"
    >
      <div className="flex items-center justify-between">
        <code className="text-muted-foreground inline-block text-xs">
          #{notification.id}
        </code>
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
      <div>
        <p className="text-muted-foreground text-xs font-medium uppercase">
          {notification.subject}
        </p>
        <p>{notification.message}</p>

        <div className="text-muted-foreground mt-4 text-xs">
          <p>
            Created at: {format(notification.createdAt, "MMMM d, yyyy hh:mm a")}
          </p>
          <p>
            Seen at:{" "}
            {notification.seenAt
              ? format(notification.seenAt, "MMMM d, yyyy hh:mm a")
              : "Not seen"}
          </p>
          <p>
            Updated at: {format(notification.updatedAt, "MMMM d, yyyy hh:mm a")}
          </p>
        </div>
      </div>
    </div>
  );
};
