"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, Loader, OctagonAlert } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Switch } from "@workspace/ui/components/switch";
import { TabLineAnimate } from "@workspace/ui/custom/tab-line-animate";

import { useTRPC } from "@workspace/trpc/client";

import { Content } from "@/components/content-admin";

import { Notifications } from "./notifications";
import { Payments } from "./payments";
import { Profile } from "./profile";
import { Settings } from "./settings";

const TAB_STORAGE_KEY = "admin:userTab";

export default function EachOrganization() {
  const [tabParam, setTabParam] = useQueryState("tab", parseAsString);

  // No tab in the URL → restore the last-used tab from localStorage.
  useEffect(() => {
    if (tabParam == null && typeof window !== "undefined") {
      const stored = localStorage.getItem(TAB_STORAGE_KEY);
      if (stored) setTabParam(stored);
    }
  }, [tabParam, setTabParam]);

  const activeTab = tabParam ?? "profile";

  const setActiveTab = (tab: string) => {
    setTabParam(tab);
    if (typeof window !== "undefined") localStorage.setItem(TAB_STORAGE_KEY, tab);
  };

  const { id } = useParams<{ id: string }>();

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: user, isPending } = useQuery(
    trpc.users.get.queryOptions(id, {
      enabled: !!id,
    })
  );

  const toggleClient = useMutation(
    trpc.users.adminUpdate.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.users.get.queryKey(id),
        });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const router = useRouter();

  return (
    <Content className="pb-48">
      <button
        onClick={() => router.back()}
        className="hover:text-foreground text-muted-foreground mb-4 flex items-center gap-1 text-sm transition-colors"
      >
        <ArrowLeftIcon size={12} strokeWidth={3} />
        Users
      </button>
      <div className="mb-6 flex items-center gap-4">
        <Avatar className="size-12 rounded-lg">
          <AvatarImage src={user?.image ?? ""} />
          <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-2xl">{user?.name}</p>
          <p className="text-muted-foreground text-xs">{user?.email}</p>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <div className="text-right">
            <p className="text-sm font-medium leading-none">Client</p>
            <p className="text-muted-foreground text-[11px]">
              Unlock portal client features
            </p>
          </div>
          <Switch
            checked={!!user?.isClient}
            disabled={!user || toggleClient.isPending}
            onCheckedChange={(checked) =>
              toggleClient.mutate({ id, isClient: checked })
            }
          />
        </div>
      </div>
      <TabLineAnimate
        tabs={[
          { label: "Profile", value: "profile" },
          { label: "Payments", value: "payments" },
          { label: "Settings", value: "settings" },
          { label: "Notifications", value: "notifications" },
        ]}
        tab={activeTab}
        setTab={setActiveTab}
        className="mb-4"
      />

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

      {isPending ? (
        <div className="flex min-h-96 items-center justify-center">
          <Loader className="size-6 animate-spin" />
        </div>
      ) : (
        <>
          {activeTab.toLowerCase() === "profile" && <Profile />}
          {activeTab.toLowerCase() === "payments" && <Payments />}
          {activeTab.toLowerCase() === "settings" && <Settings />}
          {activeTab.toLowerCase() === "notifications" && <Notifications />}
        </>
      )}
    </Content>
  );
}
