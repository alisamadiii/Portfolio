"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, Loader, OctagonAlert } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";

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
import { TabLineAnimate } from "@workspace/ui/custom/tab-line-animate";

import { useTRPC } from "@workspace/trpc/client";

import { Content } from "@/components/content-admin";

import { Payments } from "./payments";
import { Profile } from "./profile";

export default function EachOrganization() {
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsString.withDefault("profile")
  );

  const { id } = useParams<{ id: string }>();

  const trpc = useTRPC();
  const { data: user, isPending } = useQuery(
    trpc.admin.users.getById.queryOptions(id, {
      enabled: !!id,
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
      </div>
      <TabLineAnimate
        tabs={[
          { label: "Profile", value: "profile" },
          { label: "Payments", value: "payments" },
          { label: "Settings", value: "settings" },
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
        </>
      )}
    </Content>
  );
}
