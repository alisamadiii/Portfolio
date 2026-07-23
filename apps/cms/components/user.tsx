"use client";

import { useUser } from "@/contexts/user-context";
import { ArrowUpRight } from "lucide-react";
import { useTheme } from "next-themes";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { urls } from "@workspace/ui/lib/company";
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
  const { user } = useUser();
  const { theme, setTheme } = useTheme();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(className, "rounded-full")}
        >
          <Avatar className="size-6">
            <AvatarImage
              src={
                user?.githubUsername
                  ? `https://github.com/${user.githubUsername}.png`
                  : `https://unavatar.io/${user?.email}?fallback=false`
              }
              alt={user?.name || user.email}
            />
            <AvatarFallback>
              {getInitialsFromName(user.name ?? undefined)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="max-w-[12.5rem]">
        <DropdownMenuLabel>
          <div className="truncate text-sm font-medium">
            {user.name || user.githubUsername || user.email}
          </div>
          <div className="text-muted-foreground truncate text-xs font-normal">
            {user.email}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-muted-foreground w-40 text-xs font-medium">
          Theme
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light" onClick={onClick}>
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" onClick={onClick}>
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system" onClick={onClick}>
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={urls.portal} target="_blank" rel="noreferrer">
            Account
            <ArrowUpRight className="ml-auto size-3.5 opacity-60" />
          </a>
        </DropdownMenuItem>
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
