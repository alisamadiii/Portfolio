import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";
import { RouterOutputs } from "@workspace/trpc/routers/_app";
import { ProjectType } from "@workspace/drizzle/schema";

import { Badge } from "../components/badge";
import { Spinner } from "../components/spinner";
import { cn } from "../lib/utils";

interface EmbedNotificationsProps {
  project: ProjectType;
}

export const EmbedNotifications = ({ project }: EmbedNotificationsProps) => {
  const trpc = useTRPC();
  const getNotifications = useQuery(
    trpc.notification.get.queryOptions({ project })
  );

  return getNotifications.isPending ? (
    <Spinner />
  ) : getNotifications.isError ? (
    <p className="text-destructive">{getNotifications.error.message}</p>
  ) : getNotifications.data.length === 0 ? (
    <p className="text-muted-foreground">No notifications found</p>
  ) : (
    getNotifications.data &&
    getNotifications.data.length > 0 && (
      <div className="mb-8">
        <p className="mb-4 px-5 text-lg font-medium">Sent Messages</p>
        {(() => {
          const order = ["PENDING", "SEEN", "SEEN_BY_ADMIN", "RESOLVED"] as const;
          const sections: Record<(typeof order)[number], string> = {
            PENDING: "Pending",
            SEEN: "Seen",
            SEEN_BY_ADMIN: "Seen by Admin",
            RESOLVED: "Resolved",
          };
          const grouped = order.reduce((acc, status) => {
            acc[status] = getNotifications.data!.filter(
              (n) => n.status === status
            );
            return acc;
          }, {} as Record<(typeof order)[number], typeof getNotifications.data>);

          return (
            <div className="space-y-6">
              {order.map(
                (status) =>
                  grouped[status].length > 0 && (
                    <div key={status}>
                      <p className="text-muted-foreground mb-2 px-5 text-sm font-medium uppercase tracking-wide">
                        {sections[status]}
                      </p>
                      <div className="space-y-2">
                        {grouped[status].map((notification) => (
                          <EachNotifications
                            key={notification.id}
                            notification={notification}
                          />
                        ))}
                      </div>
                    </div>
                  )
              )}
            </div>
          );
        })()}
      </div>
    )
  );
};

const EachNotifications = ({
  notification,
}: {
  notification: RouterOutputs["notification"]["get"][number];
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
