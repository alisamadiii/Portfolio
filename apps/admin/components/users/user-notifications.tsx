"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Send,
} from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

import { CardAgency } from "@workspace/ui/agency/card-agency";

import { useTRPC } from "@workspace/trpc/client";

const notifPriorityColor: Record<string, string> = {
  URGENT: "bg-red-500/10 text-red-600 border-red-500/20",
  HIGH: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  MEDIUM: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  LOW: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
};

const notifStatusIcon: Record<string, React.ElementType> = {
  PENDING: Clock,
  SEEN: Eye,
  SEEN_BY_ADMIN: Eye,
  RESOLVED: CheckCircle2,
  REJECTED: AlertCircle,
  REPLIED: Send,
};

export function UserNotifications({ userEmail }: { userEmail: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [sendOpen, setSendOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const { data: notifications, isLoading } = useQuery(
    trpc.notification.listByEmail.queryOptions({ email: userEmail })
  );

  const updateStatus = useMutation(
    trpc.notification.updateStatus.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.notification.listByEmail.queryKey({ email: userEmail }),
        });
      },
    })
  );

  const sendMessage = useMutation(
    trpc.notification.sendToUser.mutationOptions({
      onSuccess: () => {
        setSendOpen(false);
        setSubject("");
        setMessage("");
      },
    })
  );

  return (
    <div className="space-y-6">
      <CardAgency.Card>
        <CardAgency.Header title="Notifications">
          <div className="flex items-center gap-2">
            {notifications && (
              <Badge variant="secondary">{notifications.length}</Badge>
            )}
            <Dialog open={sendOpen} onOpenChange={setSendOpen}>
              <DialogTrigger render={<Button size="sm" />}>
                <Send className="mr-1.5 size-3.5" />
                Send Message
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Message</DialogTitle>
                  <DialogDescription>
                    Send an email to {userEmail}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div>
                    <Label className="text-xs font-medium">Subject</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Message subject..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Message</Label>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write your message..."
                      className="mt-1"
                      rows={5}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setSendOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() =>
                      sendMessage.mutate({
                        to: userEmail,
                        subject,
                        message,
                      })
                    }
                    disabled={
                      !subject || !message || sendMessage.isPending
                    }
                  >
                    {sendMessage.isPending && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    Send
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardAgency.Header>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="text-muted-foreground mx-auto mb-2 size-8 opacity-40" />
            <p className="text-muted-foreground text-sm">
              No notifications from this user.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => {
              const StatusIcon =
                notifStatusIcon[notif.status] ?? Clock;
              return (
                <div
                  key={notif.id}
                  className="bg-background/50 rounded-xl border p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold">{notif.subject}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            notifPriorityColor[notif.priority]
                          )}
                        >
                          {notif.priority}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                        {notif.message}
                      </p>
                      <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <StatusIcon className="size-3" />
                          {notif.status.replace(/_/g, " ")}
                        </span>
                        <span>
                          {notif.projectType}
                        </span>
                        <span>
                          {formatDistanceToNow(new Date(notif.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {notif.status === "PENDING" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          disabled={updateStatus.isPending}
                          onClick={() =>
                            updateStatus.mutate({
                              notificationId: notif.id,
                              status: "SEEN_BY_ADMIN",
                            })
                          }
                        >
                          <Eye className="mr-1 size-3" />
                          Seen
                        </Button>
                      )}
                      {notif.status !== "RESOLVED" &&
                        notif.status !== "REJECTED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            disabled={updateStatus.isPending}
                            onClick={() =>
                              updateStatus.mutate({
                                notificationId: notif.id,
                                status: "RESOLVED",
                              })
                            }
                          >
                            <CheckCircle2 className="mr-1 size-3" />
                            Resolve
                          </Button>
                        )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardAgency.Card>
    </div>
  );
}
