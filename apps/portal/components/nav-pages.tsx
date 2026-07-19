"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";
import { cn } from "@workspace/ui/lib/utils";

export function NavPages({
  label,
  pages,
}: {
  label: string;
  pages: {
    title: string;
    url: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  }[];
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="text-sidebar-foreground/60 px-3 text-[11px] font-semibold tracking-[0.06em] uppercase">
        {label}
      </SidebarGroupLabel>
      <SidebarMenu className="gap-0.5">
        {pages.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              className={cn(
                "h-auto gap-3 rounded-[14px] border-l-2 border-l-transparent px-3.5 py-2.5 text-[14.5px] font-medium [&>svg]:size-[19px]",
                "hover:bg-sidebar-foreground/8 hover:text-sidebar-accent-foreground",
                pathname === item.url &&
                  "bg-sidebar-accent text-sidebar-accent-foreground border-l-sidebar-ring hover:bg-sidebar-accent font-semibold"
              )}
              render={<Link href={item.url} />}
            >
              <item.icon />
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
