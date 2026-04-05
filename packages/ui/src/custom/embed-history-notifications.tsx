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
  project: _project,
}: EmbedHistoryNotificationsProps) => {
  const trpc = useTRPC();
  const historyNotifications = useQuery(trpc.notification.history.queryOptions());

  return historyNotifications.isPending ? (
    <Spinner />
  ) : historyNotifications.isError ? (
    <p className="text-destructive">{historyNotifications.error.message}</p>
  ) : historyNotifications.data.length === 0 ? (
    <p className="text-muted-foreground">No notifications found</p>
  ) : (
    <div className="mb-8 space-y-4 px-4">
      {historyNotifications.data.map((notification) => (
        <EachNotification key={notification.id} notification={notification} />
      ))}
    </div>
  );
};

const EachNotification = ({
  notification,
}: {
  notification: RouterOutputs["notification"]["history"][number];
}) => {
  return (
    <div className="bg-muted space-y-4 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <code className="text-muted-foreground inline-block text-xs">
          #{notification.id}
        </code>
        <Badge
          className={cn(
            notification.status === "RESOLVED"
              ? "bg-green-500 text-white"
              : notification.status === "REPLIED"
                ? "bg-purple-500 text-white"
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
        {notification.status === "REPLIED" && (
          <a
            href={`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(notification.id)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-500/20 transition-colors"
          >
            Find reply in inbox
          </a>
        )}
      </div>
    </div>
  );
};
