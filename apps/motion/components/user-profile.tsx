import React from "react";
import Link from "next/link";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { MotionPremium } from "@workspace/ui/icons";
import { urls } from "@workspace/ui/lib/company";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { useIsPurchased } from "@/hooks/use-is-purchased";

export const UserProfile = () => {
  const { data: user, isPending } = useCurrentUser();

  const { data: isUserPurchased } = useIsPurchased();

  if (isPending) return null;

  if (!user) {
    return (
      <Button size="lg" asChild>
        <Link
          href={`${urls.portal}/login?redirectUrl=${window.location.href}`}
        >
          Login
        </Link>
      </Button>
    );
  }

  return (
    <Link href={urls.portal}>
      <div className="relative flex items-center justify-center">
        <Avatar className="size-12 border">
          <AvatarImage src={user?.user.image ?? ""} />
          <AvatarFallback>{user?.user.name?.charAt(0)}</AvatarFallback>
        </Avatar>
        {isUserPurchased && (
          <MotionPremium className="bg-background absolute -right-0.5 -bottom-0.5 size-5 rounded-full p-0.5 text-yellow-500" />
        )}
      </div>
    </Link>
  );
};
