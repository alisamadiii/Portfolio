"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@workspace/ui/components/sidebar";
import { cn } from "@workspace/ui/lib/utils";

import { ChevronDown } from "@/components/icon";

type SubPage = {
  title: string;
  url: string;
  /** Active check when it's more than "same URL" (e.g. detail pages). */
  match?: (pathname: string) => boolean;
};

const isSubActive = (page: SubPage, pathname: string) =>
  page.match ? page.match(pathname) : pathname === page.url;

/** A page with sub-pages: toggles open, starts open when one of them is showing. */
function NavGroupItem({
  item,
  pathname,
}: {
  item: {
    title: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    items: SubPage[];
  };
  pathname: string;
}) {
  const anyActive = item.items.some((page) => isSubActive(page, pathname));
  const [open, setOpen] = useState(true);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        aria-expanded={open}
        className={cn(
          "h-auto gap-3 rounded-[14px] border-l-2 border-l-transparent px-3.5 py-2.5 text-[14.5px] font-medium [&>svg]:size-[19px]",
          "hover:bg-sidebar-foreground/8 hover:text-sidebar-accent-foreground",
          anyActive && "text-sidebar-accent-foreground font-semibold"
        )}
        onClick={() => setOpen((value) => !value)}
      >
        <item.icon />
        <span>{item.title}</span>
        <ChevronDown
          className={cn(
            "ml-auto size-4! transition-transform duration-200",
            !open && "-rotate-90"
          )}
        />
      </SidebarMenuButton>
      {open && (
        <SidebarMenuSub className="mt-0.5 ml-6 gap-0.5">
          {item.items.map((page) => (
            <SidebarMenuSubItem key={page.url}>
              <SidebarMenuSubButton
                isActive={isSubActive(page, pathname)}
                className="hover:bg-sidebar-foreground/8 data-[active=true]:bg-sidebar-accent h-9 rounded-[10px] px-3 text-[14px] data-[active=true]:font-semibold"
                render={<Link href={page.url} />}
              >
                <span>{page.title}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}

export function NavPages({
  label,
  pages,
}: {
  label: string;
  pages: {
    title: string;
    url: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    badge?: React.ReactNode;
    items?: SubPage[];
  }[];
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="text-sidebar-foreground/60 px-3 text-[11px] font-semibold tracking-[0.06em] uppercase">
        {label}
      </SidebarGroupLabel>
      <SidebarMenu className="gap-0.5">
        {pages.map((item) =>
          item.items ? (
            <NavGroupItem
              key={item.title}
              item={{ ...item, items: item.items }}
              pathname={pathname}
            />
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                className={cn(
                  "h-auto gap-3 rounded-[14px] border-l-2 border-l-transparent px-3.5 py-2.5 text-[14.5px] font-medium [&>svg]:size-[19px]",
                  "hover:bg-sidebar-foreground/8 hover:text-sidebar-accent-foreground",
                  (pathname === item.url ||
                    (item.url !== "/" &&
                      pathname.startsWith(`${item.url}/`))) &&
                    "bg-sidebar-accent text-sidebar-accent-foreground border-l-sidebar-ring hover:bg-sidebar-accent font-semibold"
                )}
                render={<Link href={item.url} />}
              >
                <item.icon />
                <span>{item.title}</span>
                {item.badge && (
                  <span className="ml-auto flex items-center">
                    {item.badge}
                  </span>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
