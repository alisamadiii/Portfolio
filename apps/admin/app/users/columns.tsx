"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import {
  Ban,
  ChevronDown,
  ChevronUp,
  CircleUserRound,
  MoreHorizontal,
  Trash,
  VenetianMask,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Textarea } from "@workspace/ui/components/textarea";
import { ReadyConfirmDialog } from "@workspace/ui/custom/confirm-alert-dialog";
import { cn } from "@workspace/ui/lib/utils";

import { urls } from "@workspace/ui/lib/company";

import { queryClient, useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import {
  useImpersonateUser,
  useUpdateAdminUser,
} from "@workspace/auth/hooks/use-admin";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { StatusBadge } from "@/components/status-badge";

type UserFromAPI = RouterOutputs["users"]["list"][number];

export type UsersTableMeta = {
  sortBy: string;
  toggleSort: (key: "email" | "created") => void;
};

/** Column header that drives the server-side sortBy via table meta. */
const SortableHeader = ({
  label,
  sortKey,
  meta,
}: {
  label: string;
  sortKey: "email" | "created";
  meta?: UsersTableMeta;
}) => {
  const active = meta?.sortBy === sortKey;
  return (
    <button
      onClick={() => meta?.toggleSort(sortKey)}
      className={cn(
        "hover:text-foreground flex items-center gap-1 transition-colors",
        active && "text-foreground"
      )}
    >
      {label}
      {active ? (
        <ChevronUp className="size-3" />
      ) : (
        <ChevronDown className="size-3 opacity-40" />
      )}
    </button>
  );
};

export const columnsLoading: ColumnDef<UserFromAPI>[] = [
  {
    header: "User",
    cell: () => <div className="flex items-center gap-2"></div>,
  },
  {
    header: "Joined",
    cell: () => <div></div>,
  },
  {
    id: "actions",
    cell: () => {
      return <div className="flex justify-end"></div>;
    },
  },
];

export const columns: ColumnDef<UserFromAPI>[] = [
  {
    id: "user",
    header: ({ table }) => (
      <SortableHeader
        label="User"
        sortKey="email"
        meta={table.options.meta as UsersTableMeta}
      />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <Avatar className="size-7">
          <AvatarImage src={row.original.image ?? ""} />
          <AvatarFallback className="text-[10px]">
            {row.original.name?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex items-baseline gap-2 text-sm">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-muted-foreground text-xs">
            {row.original.email}
          </span>
          {row.original.role === "admin" && (
            <StatusBadge tone="violet">Admin</StatusBadge>
          )}
        </div>
      </div>
    ),
  },
  {
    header: "Status",
    cell: ({ row }) =>
      row.original.banned ? (
        <StatusBadge tone="red" dot>
          Banned
        </StatusBadge>
      ) : (
        <StatusBadge tone="green" dot>
          Active
        </StatusBadge>
      ),
  },
  {
    id: "joined",
    header: ({ table }) => (
      <SortableHeader
        label="Joined"
        sortKey="created"
        meta={table.options.meta as UsersTableMeta}
      />
    ),
    cell: ({ row }) => (
      <div className="text-num text-muted-foreground text-xs">
        {format(
          typeof row.original.createdAt === "string"
            ? parseISO(row.original.createdAt)
            : row.original.createdAt,
          "MMM d, yyyy"
        )}
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      /* eslint-disable */
      const router = useRouter();

      const [isOpen, setIsOpen] = useState(false);
      const [banOpen, setBanOpen] = useState(false);
      const [deleteOpen, setDeleteOpen] = useState(false);
      const updateAdminUser = useUpdateAdminUser();
      const impersonate = useImpersonateUser();
      const { data: currentUser } = useCurrentUser();
      const isSelf = currentUser?.user.id === row.original.id;

      const handleImpersonate = (event: React.MouseEvent) => {
        // Keep the row's onRowClick from navigating to the user page.
        event.stopPropagation();
        // Open the tab synchronously so popup blockers don't eat it.
        const tab = window.open("", "_blank");
        impersonate.mutate(
          { userId: row.original.id },
          {
            onSuccess: () => {
              if (tab) tab.location.href = urls.cms;
            },
            onError: (error) => {
              tab?.close();
              toast.error(error.message);
            },
          }
        );
        setIsOpen(false);
      };
      const deleteAccount = useMutation(
        useTRPC().users.delete.mutationOptions({
          onSuccess: () => {
            router.push("/");

            // Clear all queries
            queryClient.clear();

            // Delete all local storage and session storage items
            localStorage.clear();
            sessionStorage.clear();
          },
        })
      );

      const formRef = useRef<HTMLFormElement>(null);
      /* eslint-enable */

      return (
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {!isSelf && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100"
              title="Impersonate"
              onClick={handleImpersonate}
            >
              <VenetianMask className="size-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-7 opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100"
            title="View profile"
            onClick={() => router.push(`/users/${row.original.id}`)}
          >
            <CircleUserRound className="size-4" />
          </Button>
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[300px]"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuGroup>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    if (row.original.banned) {
                      updateAdminUser.mutate({
                        banned: false,
                        role: "user",
                        banReason: "",
                        id: row.original.id,
                      });
                    } else {
                      setTimeout(() => {
                        setBanOpen(true);
                      }, 100);
                    }
                    setIsOpen(false);
                  }}
                >
                  <Ban /> {row.original.banned ? "Unban" : "Ban"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    setDeleteOpen(true);
                  }}
                >
                  <Trash /> Delete user
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog open={banOpen} onOpenChange={setBanOpen}>
            <AlertDialogContent className="md:max-w-96">
              <AlertDialogHeader className="gap-0">
                <AlertDialogTitle className="text-base">
                  Ban user
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs">
                  Are you sure you want to ban {row.original.name}?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <form
                className="flex flex-col gap-2"
                ref={formRef}
                onSubmit={(e) => {
                  e.preventDefault();

                  const formData = new FormData(e.target as HTMLFormElement);

                  const banReason = formData.get("banReason") as string;

                  updateAdminUser.mutate(
                    {
                      id: row.original.id,
                      banned: !row.original.banned,
                      role: "user",
                      banReason,
                    },
                    {
                      onSuccess: () => {
                        setBanOpen(false);
                      },
                    }
                  );
                }}
              >
                <Textarea
                  placeholder="Ban Reason (optional)"
                  name="banReason"
                  rows={10}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      const form = e.currentTarget.closest("form");
                      if (form) {
                        form.requestSubmit();
                      }
                    }
                  }}
                />
              </form>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button
                  type="submit"
                  isLoading={updateAdminUser.isPending}
                  onClick={() => formRef.current?.requestSubmit()}
                >
                  Ban user
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <ReadyConfirmDialog
            isOpen={deleteOpen}
            onOpenChange={setDeleteOpen}
            title="Delete user"
            description="Are you sure you want to delete this user?"
            action={{
              label: "Delete user",
              onClick: () =>
                deleteAccount.mutate(row.original.id, {
                  onSuccess: () => setDeleteOpen(false),
                }),
              isPending: deleteAccount.isPending,
              isError: deleteAccount.isError,
              error: deleteAccount.error?.message,
              isSuccess: deleteAccount.isSuccess,
            }}
          />
        </div>
      );
    },
  },
];
