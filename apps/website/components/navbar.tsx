"use client";

import Link from "next/link";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import { useLogout } from "@workspace/auth/hooks/use-functions";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

export const Navbar = () => {
  const { data } = useCurrentUser();

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 px-4">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
        <div></div>
        {data?.user ? (
          <UserDropdown />
        ) : (
          <Link href="/login" className={buttonVariants({})}>
            Login
          </Link>
        )}
      </div>
    </nav>
  );
};

const UserDropdown = () => {
  const { data: currentUser } = useCurrentUser();
  const logout = useLogout();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">
          {currentUser?.user?.email}
        </span>
        <Avatar>
          <AvatarImage src={currentUser?.user?.image ?? ""} />
          <AvatarFallback />
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <Link href="/settings/general">
          <DropdownMenuItem>Profile</DropdownMenuItem>
        </Link>
        <Link href="/settings/billing">
          <DropdownMenuItem>Billing</DropdownMenuItem>
        </Link>
        <DropdownMenuItem onClick={() => logout.mutate()}>
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
