"use client";

import Link from "next/link";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";

import { signOut } from "@/lib/auth-client";
import { getInitialsFromName } from "@/lib/utils/avatar";

export function User({
  className,
  onClick,
  align = "end",
}: {
  className?: string;
  onClick?: () => void;
  align?: "start" | "center" | "end";
}) {
  const user = useCurrentUser().data?.user ?? null;

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Account menu"
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-avatar text-xs font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral",
              className
            )}
          >
            {getInitialsFromName(user.name ?? undefined) || user.email.slice(0, 2).toUpperCase()}
          </button>
        }
      />
      <DropdownMenuContent align={align} className="w-[14rem]">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="truncate text-sm font-medium">
              {user.name || user.email}
            </div>
            <div className="text-muted-foreground truncate text-xs font-normal">
              {user.email}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/">Sites</Link>} />
        <DropdownMenuItem render={<Link href="/billing">Billing</Link>} />
        <DropdownMenuItem render={<Link href="/account">Account</Link>} />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={async () => {
            if (onClick) onClick();
            await signOut();
            window.location.assign("/sign-in");
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
