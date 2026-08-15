"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { Command } from "cmdk";
import {
  ArrowUpRight,
  Code2,
  Copy,
  Gauge,
  ImageIcon,
  Package,
  PanelLeft,
  Search,
  SunMoon,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { create } from "zustand";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Kbd } from "@workspace/ui/components/kbd";
import { useSidebar } from "@workspace/ui/components/sidebar";
import { Spinner } from "@workspace/ui/components/spinner";

import { useTRPC } from "@workspace/trpc/client";

type CommandMenuStore = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const useCommandMenuStore = create<CommandMenuStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

const pages = [
  { label: "Overview", href: "/", icon: Gauge },
  { label: "Users", href: "/users", icon: Users },
  { label: "Products", href: "/products", icon: Package },
  { label: "Media", href: "/media", icon: ImageIcon },
  { label: "Code", href: "/code", icon: Code2 },
];

const itemClass =
  "flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";

export const CommandMenu = () => {
  const { open, setOpen } = useCommandMenuStore();
  const router = useRouter();
  const { toggleSidebar } = useSidebar();
  const { resolvedTheme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);

  const trpc = useTRPC();
  const { data: users, isFetching } = useQuery(
    trpc.users.list.queryOptions(
      { page: 1, limit: 5, search: debouncedQuery, sortBy: "created" },
      { enabled: open && debouncedQuery.length > 1 }
    )
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen(!useCommandMenuStore.getState().open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setOpen]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      shouldFilter={debouncedQuery.length <= 1}
      label="Command menu"
      overlayClassName="fixed inset-0 z-50 bg-black/60"
      contentClassName="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 duration-120 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98]"
      className="bg-popover text-popover-foreground overflow-hidden rounded-lg border shadow-lg"
    >
      <div className="flex items-center gap-2 border-b px-3">
        <Search className="text-muted-foreground size-4 shrink-0" />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search users, jump to a page…"
          className="placeholder:text-muted-foreground h-11 w-full bg-transparent text-sm outline-none"
        />
        {isFetching && <Spinner className="size-4" />}
      </div>
      <Command.List className="custom-scrollbar max-h-80 overflow-y-auto p-1.5">
        <Command.Empty className="text-muted-foreground py-8 text-center text-sm">
          No results.
        </Command.Empty>

        {users && users.length > 0 && (
          <Command.Group
            heading="Users"
            className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:uppercase"
          >
            {users.map((user) => (
              <Command.Item
                key={user.id}
                value={`user-${user.id}`}
                onSelect={() => run(() => router.push(`/users/${user.id}`))}
                className={itemClass}
              >
                <Avatar className="size-5 rounded-sm">
                  <AvatarImage src={user.image ?? ""} />
                  <AvatarFallback className="rounded-sm text-[9px]">
                    {(user.name ?? user.email).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{user.name ?? "—"}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        <Command.Group
          heading="Go to"
          className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:uppercase"
        >
          {pages.map((page) => (
            <Command.Item
              key={page.href}
              value={`go-${page.label}`}
              keywords={[page.label]}
              onSelect={() => run(() => router.push(page.href))}
              className={itemClass}
            >
              <page.icon />
              {page.label}
            </Command.Item>
          ))}
          <Command.Item
            value="go-subscriptions-polar"
            keywords={["subscriptions", "polar"]}
            onSelect={() =>
              run(() =>
                window.open(
                  `${process.env.NEXT_PUBLIC_POLAR_URL}/sales/subscriptions`,
                  "_blank"
                )
              )
            }
            className={itemClass}
          >
            <ArrowUpRight />
            Subscriptions (Polar)
          </Command.Item>
        </Command.Group>

        <Command.Group
          heading="Actions"
          className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:uppercase"
        >
          <Command.Item
            value="action-copy-url"
            keywords={["copy", "url"]}
            onSelect={() =>
              run(() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("URL copied");
              })
            }
            className={itemClass}
          >
            <Copy />
            Copy current URL
          </Command.Item>
          <Command.Item
            value="action-toggle-theme"
            keywords={["theme", "dark", "light", "mode"]}
            onSelect={() =>
              run(() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              )
            }
            className={itemClass}
          >
            <SunMoon />
            Toggle theme
          </Command.Item>
          <Command.Item
            value="action-toggle-sidebar"
            keywords={["sidebar", "toggle"]}
            onSelect={() => run(toggleSidebar)}
            className={itemClass}
          >
            <PanelLeft />
            Toggle sidebar
            <span className="ml-auto flex items-center gap-1">
              <Kbd>⌘</Kbd>
              <Kbd>B</Kbd>
            </span>
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
};
