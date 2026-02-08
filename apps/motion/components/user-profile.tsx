import React from "react";
import Link from "next/link";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { MotionPremium } from "@workspace/ui/icons";
import { cn } from "@workspace/ui/lib/utils";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { useIsPurchased } from "@/hooks/use-is-purchased";

import { LoginDrawer } from "./login-drawer";

export const UserProfile = ({
  isToggleElements,
}: {
  isToggleElements?: boolean;
}) => {
  const { data: user, isPending } = useCurrentUser();

  const { data: isUserPurchased } = useIsPurchased();

  if (isPending) return null;

  if (!user) {
    return (
      <LoginDrawer>
        <Button size="lg" className="fixed top-4 left-4 z-100">
          Login
        </Button>
      </LoginDrawer>
    );
  }
  return (
    <Link
      href={
        process.env.NODE_ENV === "development"
          ? "http://localhost:3000/settings"
          : "https://www.alisamadii.com/settings"
      }
      className={cn(
        "bg-muted fixed top-4 left-4 z-100 rounded-xl border p-3 pr-8",
        isToggleElements && "hidden"
      )}
    >
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
    </Link>
  );
};
