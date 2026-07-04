"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";

import { UserActivity } from "@/components/users/user-activity";
import { UserNotifications } from "@/components/users/user-notifications";

export const Notifications = () => {
  const { id } = useParams<{ id: string }>();
  const trpc = useTRPC();

  const { data: user } = useQuery(
    trpc.users.get.queryOptions(id, { enabled: !!id })
  );

  if (!user) return null;

  return (
    <div className="space-y-6">
      <UserNotifications userEmail={user.email} />
      <UserActivity userId={id} />
    </div>
  );
};
