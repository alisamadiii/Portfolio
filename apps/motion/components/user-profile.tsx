import React from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { MotionPremium } from "@workspace/ui/icons";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

export const UserProfile = () => {
  const { data: user } = useCurrentUser();
  const trpc = useTRPC();
  const { data: isUserPurchased } = useQuery(
    trpc.motion.isUserPurchased.queryOptions()
  );

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center justify-center">
        <Avatar className="border">
          <AvatarImage src={user?.user.image ?? ""} />
          <AvatarFallback>{user?.user.name?.charAt(0)}</AvatarFallback>
        </Avatar>
        {isUserPurchased && (
          <MotionPremium className="absolute right-0 bottom-0 size-4 text-yellow-500" />
        )}
      </div>

      <div>
        <p className="text-sm font-medium">{user?.user.name}</p>
        <p className="text-muted-foreground text-xs">{user?.user.email}</p>
      </div>
    </div>
  );
};
