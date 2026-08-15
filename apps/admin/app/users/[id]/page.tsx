"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeftIcon,
  Ban,
  Copy,
  CreditCard,
  Loader,
  MonitorSmartphone,
  OctagonAlert,
  Repeat,
  ShoppingCart,
  Trash,
  VenetianMask,
} from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
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
import { Textarea } from "@workspace/ui/components/textarea";
import { ReadyConfirmDialog } from "@workspace/ui/custom/confirm-alert-dialog";

import { urls } from "@workspace/ui/lib/company";

import { queryClient, useTRPC } from "@workspace/trpc/client";
import {
  useImpersonateUser,
  useUpdateAdminUser,
} from "@workspace/auth/hooks/use-admin";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { Content } from "@/components/content-admin";
import { SectionNav } from "@/components/section-nav";
import { StatTile } from "@/components/stat-tile";
import { StatusBadge } from "@/components/status-badge";

import { Api } from "./api";
import { Payments } from "./payments";
import { Profile } from "./profile";
import { Settings } from "./settings";

const sections = [
  { id: "profile", label: "Profile" },
  { id: "payments", label: "Payments" },
  { id: "api", label: "API" },
  { id: "settings", label: "Settings" },
];

const formatUSD = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);

export default function UserDetailPage() {
  const [tabParam] = useQueryState("tab", parseAsString);
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const trpc = useTRPC();
  const { data: user, isPending } = useQuery(
    trpc.users.get.queryOptions(id, {
      enabled: !!id,
    })
  );

  // Shared with the section components below via the React Query cache
  const { data: orders } = useQuery(
    trpc.payments.listOrders.queryOptions(
      { userId: id },
      { enabled: !!id }
    )
  );
  const { data: subscriptions } = useQuery(
    trpc.payments.getSubscriptions.queryOptions(
      { userId: id },
      { enabled: !!id }
    )
  );
  const { data: sessions } = useQuery(
    trpc.auth.getSessions.queryOptions(id, { enabled: !!id })
  );

  // Legacy ?tab= deep links land on the matching section
  useEffect(() => {
    if (tabParam && sections.some((s) => s.id === tabParam.toLowerCase())) {
      document
        .getElementById(tabParam.toLowerCase())
        ?.scrollIntoView({ block: "start" });
    }
  }, [tabParam]);

  const totalPaid =
    orders?.reduce(
      (acc, order) => (order.status === "paid" ? acc + order.totalAmount : acc),
      0
    ) ?? 0;
  const activeSubs =
    subscriptions?.filter((sub) => !sub.canceledAt).length ?? 0;

  if (isPending) {
    return (
      <Content>
        <div className="flex min-h-96 items-center justify-center">
          <Loader className="size-6 animate-spin" />
        </div>
      </Content>
    );
  }

  return (
    <Content className="scroll-smooth pb-48">
      <button
        onClick={() => router.back()}
        className="hover:text-foreground text-muted-foreground mb-4 flex items-center gap-1 text-xs transition-colors"
      >
        <ArrowLeftIcon size={12} strokeWidth={3} />
        Users
      </button>

      <div className="bg-card mb-4 flex flex-wrap items-center gap-4 rounded-2xl border p-5">
        <Avatar className="size-14">
          <AvatarImage src={user?.image ?? ""} />
          <AvatarFallback className="text-lg">
            {user?.name?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-lg font-semibold tracking-tight">
              {user?.name}
            </p>
            {user?.role === "admin" && (
              <StatusBadge tone="violet">Admin</StatusBadge>
            )}
            {user?.banned ? (
              <StatusBadge tone="red" dot>
                Banned
              </StatusBadge>
            ) : (
              <StatusBadge tone="green" dot>
                Active
              </StatusBadge>
            )}
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span>{user?.email}</span>
            {user?.id && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(user.id);
                  toast.success("User ID copied");
                }}
                className="text-num hover:text-foreground flex items-center gap-1 transition-colors"
                title="Copy user ID"
              >
                {user.id.slice(0, 8)}…
                <Copy className="size-3" />
              </button>
            )}
            {user?.createdAt && (
              <span className="text-num">
                Joined {format(new Date(user.createdAt), "MMM d, yyyy")}
              </span>
            )}
          </div>
        </div>
        {user && <UserActions user={user} />}
      </div>

      {user?.banned && (
        <Alert variant="destructive" className="mb-4">
          <OctagonAlert />
          <AlertTitle>Banned User</AlertTitle>
          <AlertDescription>
            <p>
              This user is banned from the platform because of the following
              reason:{" "}
              <span className="font-medium">
                {user?.banReason || "no reason provided"}
              </span>
              .
            </p>
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={<CreditCard />}
          tone="amber"
          label="Total paid"
          value={formatUSD(totalPaid)}
        />
        <StatTile
          icon={<ShoppingCart />}
          tone="violet"
          label="Orders"
          value={orders?.length ?? 0}
        />
        <StatTile
          icon={<Repeat />}
          tone="green"
          label="Active subs"
          value={activeSubs}
        />
        <StatTile
          icon={<MonitorSmartphone />}
          tone="orange"
          label="Devices"
          value={sessions?.length ?? 0}
        />
      </div>

      <div className="lg:grid lg:grid-cols-[10rem_1fr] lg:gap-8">
        <SectionNav items={sections} className="mb-6 lg:mb-0" />
        <div className="min-w-0 space-y-10">
          <section id="profile" className="scroll-mt-24">
            <h2 className="mb-3 text-base font-semibold">Profile</h2>
            <Profile />
          </section>
          <section id="payments" className="scroll-mt-24">
            <h2 className="mb-3 text-base font-semibold">Payments</h2>
            <Payments />
          </section>
          <section id="api" className="scroll-mt-24">
            <h2 className="mb-3 text-base font-semibold">API</h2>
            <Api />
          </section>
          <section id="settings" className="scroll-mt-24">
            <h2 className="mb-3 text-base font-semibold">Settings</h2>
            <Settings />
          </section>
        </div>
      </div>
    </Content>
  );
}

/** Surfaced record actions — same hooks and dialogs as the users-table row menu. */
const UserActions = ({
  user,
}: {
  user: { id: string; name: string | null; banned: boolean | null };
}) => {
  const router = useRouter();
  const [banOpen, setBanOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const updateAdminUser = useUpdateAdminUser();
  const impersonate = useImpersonateUser();
  const { data: currentUser } = useCurrentUser();
  const isSelf = currentUser?.user.id === user.id;
  const formRef = useRef<HTMLFormElement>(null);

  const trpc = useTRPC();
  const deleteAccount = useMutation(
    trpc.users.delete.mutationOptions({
      onSuccess: () => {
        router.push("/users");
        queryClient.clear();
      },
    })
  );

  const handleImpersonate = () => {
    // Open the tab synchronously so popup blockers don't eat it.
    const tab = window.open("", "_blank");
    impersonate.mutate(
      { userId: user.id },
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
  };

  return (
    <div className="ml-auto flex items-center gap-2">
      {!isSelf && (
        <Button variant="outline" size="sm" onClick={handleImpersonate}>
          <VenetianMask /> Impersonate
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (user.banned) {
            updateAdminUser.mutate({
              banned: false,
              role: "user",
              banReason: "",
              id: user.id,
            });
          } else {
            setBanOpen(true);
          }
        }}
      >
        <Ban /> {user.banned ? "Unban" : "Ban"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash /> Delete
      </Button>

      <AlertDialog open={banOpen} onOpenChange={setBanOpen}>
        <AlertDialogContent className="md:max-w-96">
          <AlertDialogHeader className="gap-0">
            <AlertDialogTitle className="text-base">Ban user</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to ban {user.name}?
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
                  id: user.id,
                  banned: true,
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
                  e.currentTarget.closest("form")?.requestSubmit();
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
            deleteAccount.mutate(user.id, {
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
};
