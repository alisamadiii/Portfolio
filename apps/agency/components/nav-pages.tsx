"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";
import { RequestDialog } from "@workspace/ui/custom/request-dialog";
import { cn } from "@workspace/ui/lib/utils";

export function NavPages({
  pages,
}: {
  pages: {
    title: string;
    url: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  }[];
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Pages</SidebarGroupLabel>
      <SidebarMenu>
        {pages.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              asChild
              className={cn(
                "py-4",
                pathname === item.url &&
                  "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              )}
            >
              <Link href={item.url}>
                <item.icon />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <RequestDialog>
            <SidebarMenuButton className={cn("py-4")}>
              <HelpCircle />
              <span>Support</span>
            </SidebarMenuButton>
          </RequestDialog>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
