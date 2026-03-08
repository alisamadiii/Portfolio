import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";
import { RouterOutputs } from "@workspace/trpc/routers/_app";
import { projectsTypeValues } from "@workspace/drizzle/schema";

import { Badge } from "../components/badge";
import { cn } from "../lib/utils";

interface EmbedNotificationsProps {
  project: (typeof projectsTypeValues)[number];
}

export const EmbedNotifications = ({ project }: EmbedNotificationsProps) => {
  const trpc = useTRPC();
  const sentNotifications = useQuery(
    trpc.notification.sentNotifications.queryOptions({ project })
  );

  return (
    sentNotifications.data &&
    sentNotifications.isSuccess && (
      <div className="mb-8">
        <p className="mb-2 px-5 text-lg font-medium">Sent Messages</p>
        <div className="space-y-2">
          {sentNotifications.data.map((notification) => (
            <EachNotifications
              key={notification.id}
              notification={notification}
            />
          ))}
        </div>
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
