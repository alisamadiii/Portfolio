"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
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

export type ProjectNavPage = {
  title: string;
  url: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badge?: React.ReactNode;
  /** Only active on this exact URL (the project's home). */
  exact?: boolean;
  items?: SubPage[];
};

const isSubActive = (page: SubPage, pathname: string) =>
  page.match ? page.match(pathname) : pathname === page.url;

const isActive = (page: ProjectNavPage, pathname: string) =>
  pathname === page.url || (!page.exact && pathname.startsWith(`${page.url}/`));

/** A page with sub-pages: toggles open, starts open. */
function ProjectNavGroup({
  item,
  pathname,
}: {
  item: ProjectNavPage & { items: SubPage[] };
  pathname: string;
}) {
  const anyActive = item.items.some((page) => isSubActive(page, pathname));
  const [open, setOpen] = useState(true);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        aria-expanded={open}
        className={cn(
          "hover:bg-sidebar-foreground/6 hover:text-sidebar-accent-foreground h-8 gap-2 rounded-md px-2 text-[13px] font-medium [&>svg]:size-4",
          anyActive && "text-sidebar-accent-foreground"
        )}
        onClick={() => setOpen((value) => !value)}
      >
        <item.icon />
        <span>{item.title}</span>
        <ChevronDown
          className={cn(
            "text-sidebar-foreground/50 ml-auto size-3.5! transition-transform duration-200",
            !open && "-rotate-90"
          )}
        />
      </SidebarMenuButton>
      {open && (
        <SidebarMenuSub className="border-sidebar-border mx-0 ml-[15px] gap-px py-0.5 pr-0 pl-2">
          {item.items.map((page) => (
            <SidebarMenuSubItem key={page.url}>
              <SidebarMenuSubButton
                isActive={isSubActive(page, pathname)}
                className="hover:bg-sidebar-foreground/6 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground h-7 rounded-md px-2 text-[12.5px]"
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

/** Compact nav for inside a project (/p/[projectId]); the hub home uses NavPages. */
export function ProjectNav({
  label,
  pages,
}: {
  label?: string;
  pages: ProjectNavPage[];
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup className="px-2 py-1 group-data-[collapsible=icon]:hidden">
      {label && (
        <p className="text-sidebar-foreground/50 px-2 pt-3 pb-1 text-[10.5px] font-semibold tracking-[0.06em] uppercase">
          {label}
        </p>
      )}
      <SidebarMenu className="gap-px">
        {pages.map((item) =>
          item.items ? (
            <ProjectNavGroup
              key={item.title}
              item={{ ...item, items: item.items }}
              pathname={pathname}
            />
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                isActive={isActive(item, pathname)}
                className="hover:bg-sidebar-foreground/6 hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground h-8 gap-2 rounded-md px-2 text-[13px] font-medium data-[active=true]:font-medium [&>svg]:size-4"
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
