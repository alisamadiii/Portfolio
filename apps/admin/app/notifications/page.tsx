"use client";

import { useMemo, useState } from "react";
import { useDebounce } from "@uidotdev/usehooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Reply, Search } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Field, FieldError } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  InputGroup,
  InputGroupInput,
  InputGroupText,
} from "@workspace/ui/components/input-group";
import { Textarea } from "@workspace/ui/components/textarea";
import { DataTable } from "@workspace/ui/custom/data-table";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { RouterOutputs } from "@workspace/trpc/routers/_app";

type Notification =
  RouterOutputs["notification"]["getAllNotifications"][number];

const priorityClass: Record<string, string> = {
  URGENT: "bg-red-500/15 text-red-600",
  HIGH: "bg-orange-500/15 text-orange-600",
  MEDIUM: "bg-yellow-500/15 text-yellow-600",
  LOW: "bg-green-500/15 text-green-600",
};

const statusClass: Record<string, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-600",
  SEEN: "bg-blue-500/15 text-blue-600",
  SEEN_BY_ADMIN: "bg-blue-500/15 text-blue-600",
  RESOLVED: "bg-green-500/15 text-green-600",
  REJECTED: "bg-red-500/15 text-red-600",
  REPLIED: "bg-purple-500/15 text-purple-600",
};

export default function NotificationsPage() {
  const trpc = useTRPC();
  const [replyTarget, setReplyTarget] = useState<Notification | null>(null);
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("")
  );
  const debouncedSearch = useDebounce(search, 300);

  const { data: notifications, isPending } = useQuery(
    trpc.notification.getAllNotifications.queryOptions()
  );

  const filtered = useMemo(() => {
    if (!notifications) return [];
    const term = debouncedSearch.toLowerCase().trim();
    if (!term) return notifications;
    return notifications.filter((n) =>
      [n.id, n.email, n.userName, n.subject, n.message, n.priority, n.status]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(term))
    );
  }, [notifications, debouncedSearch]);

  const columns: ColumnDef<Notification>[] = [
    {
      header: "User",
      cell: ({ row }) => {
        const n = row.original;
        const initials = n.userName?.charAt(0) ?? n.email?.charAt(0) ?? "?";
        return (
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarImage src={n.userImage ?? ""} />
              <AvatarFallback>{initials.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col -space-y-0.5">
              <span className="text-sm font-medium">
                {n.userName ?? "Guest"}
              </span>
              <span className="text-muted-foreground text-xs">{n.email}</span>
              {n.userId && (
                <span className="text-muted-foreground font-mono text-[10px]">
                  {n.userId}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: "Subject / Message",
      cell: ({ row }) => {
        const n = row.original;
        return (
          <div className="max-w-xs">
            <p className="truncate text-sm font-medium">{n.subject}</p>
            <p className="text-muted-foreground line-clamp-2 text-xs">
              {n.message}
            </p>
          </div>
        );
      },
    },
    {
      header: "Priority",
      cell: ({ row }) => (
        <Badge
          className={cn(
            "text-xs font-semibold",
            priorityClass[row.original.priority] ?? priorityClass.MEDIUM
          )}
        >
          {row.original.priority}
        </Badge>
      ),
    },
    {
      header: "Status",
      cell: ({ row }) => (
        <Badge
          className={cn(
            "text-xs font-semibold",
            statusClass[row.original.status] ?? statusClass.PENDING
          )}
        >
          {row.original.status.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      header: "Received",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {format(new Date(row.original.createdAt), "MMM d, yyyy hh:mm a")}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setReplyTarget(row.original);
            }}
          >
            <Reply className="size-3.5" />
            Reply
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <InputGroup className="max-w-sm">
          <InputGroupText position="inline-start">
            <Search className="size-4" />
          </InputGroupText>
          <InputGroupInput
            placeholder="Search by name, email, subject, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value || null)}
          />
        </InputGroup>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isPending}
      />

      {replyTarget && (
        <ReplyDialog
          notification={replyTarget}
          onClose={() => setReplyTarget(null)}
        />
      )}
    </div>
  );
}

function ReplyDialog({
  notification,
  onClose,
}: {
  notification: Notification;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState(
    `Re: ${notification.subject}`
  );
  const [message, setMessage] = useState("");
  const [subjectError, setSubjectError] = useState("");
  const [messageError, setMessageError] = useState("");

  const sendToUser = useMutation(trpc.notification.sendToUser.mutationOptions());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;

    if (!subject.trim()) {
      setSubjectError("Subject is required");
      valid = false;
    } else {
      setSubjectError("");
    }

    if (!message.trim()) {
      setMessageError("Message is required");
      valid = false;
    } else {
      setMessageError("");
    }

    if (!valid || !notification.email) return;

    sendToUser.mutate(
      {
        to: notification.email,
        subject: subject.trim(),
        message: message.trim(),
        notificationId: notification.id,
      },
      {
        onSuccess: () => {
          toast.success(`Reply sent to ${notification.email}`);
          queryClient.invalidateQueries(
            trpc.notification.getAllNotifications.queryFilter()
          );
          onClose();
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reply to {notification.userName ?? notification.email}</DialogTitle>
          <DialogDescription>
            The original message will be included in the email.
          </DialogDescription>
        </DialogHeader>

        {/* Original message context */}
        <div
          className="rounded-lg p-3 text-sm"
          style={{
            backgroundColor: "#f9fafb",
            borderLeft: "3px solid #d1d5db",
          }}
        >
          <p className="text-muted-foreground mb-0.5 text-xs font-semibold uppercase">
            Original message
          </p>
          <p className="text-muted-foreground mb-0.5 text-xs">
            From: {notification.email}
          </p>
          <p className="font-medium">{notification.subject}</p>
          <p className="text-muted-foreground line-clamp-3 text-xs">
            {notification.message}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              label="Subject"
              aria-invalid={!!subjectError}
            />
            <FieldError errors={[subjectError ? { message: subjectError } : undefined]} />
          </Field>

          <Field>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your reply..."
              rows={6}
              aria-invalid={!!messageError}
            />
            <FieldError errors={[messageError ? { message: messageError } : undefined]} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={sendToUser.isPending}
              disabled={!notification.email}
            >
              Send
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
