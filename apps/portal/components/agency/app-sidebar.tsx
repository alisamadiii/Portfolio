"use client";

import * as React from "react";
import { LayoutDashboard, Package, UserRound } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarRail,
} from "@workspace/ui/components/sidebar";

import { NavPages } from "./nav-pages";
import { NotificationBell } from "./notification-bell";

const pages = [
  {
    title: "Portal",
    url: "/agency",
    icon: LayoutDashboard,
  },
  {
    title: "Orders",
    url: "/agency/orders",
    icon: Package,
  },
  {
    title: "Customer",
    url: "/settings",
    icon: UserRound,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarContent>
        <NavPages pages={pages} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <NotificationBell />
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
