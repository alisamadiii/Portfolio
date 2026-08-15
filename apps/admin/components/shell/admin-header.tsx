"use client";

import { Copy, ExternalLink, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Kbd, KbdGroup } from "@workspace/ui/components/kbd";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { urls } from "@workspace/ui/lib/company";

import { useCommandMenuStore } from "@/components/command-menu";
import type { AdminUser } from "@/components/shell/admin-sidebar";

export const AdminHeader = ({ user }: { user: AdminUser }) => {
  const openCommandMenu = useCommandMenuStore((s) => s.setOpen);
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 px-6 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <button
        onClick={() => openCommandMenu(true)}
        className="bg-card text-muted-foreground hover:border-ring/40 flex h-10 w-full max-w-md items-center gap-2.5 rounded-xl border px-3.5 text-sm transition-colors"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 text-left">Search</span>
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <Sun className="size-4.5 dark:hidden" />
          <Moon className="hidden size-4.5 dark:block" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                className="relative rounded-full"
                aria-label="Account menu"
              />
            }
          >
            <Avatar className="size-9">
              <AvatarImage src={user.image ?? ""} />
              <AvatarFallback className="text-xs">
                {(user.name ?? user.email).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="bg-primary ring-background absolute right-0 bottom-0 block size-2.5 rounded-full ring-2" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="truncate text-sm font-medium">
                {user.name ?? "Admin"}
              </span>
              <span className="text-muted-foreground truncate text-xs font-normal">
                {user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(user.id);
                toast.success("User ID copied");
              }}
            >
              <Copy /> Copy user ID
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<a href={urls.cms} target="_blank" rel="noreferrer" />}
            >
              <ExternalLink /> Open Client Hub
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
