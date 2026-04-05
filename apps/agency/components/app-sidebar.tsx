"use client";

import * as React from "react";
import { LayoutDashboard, Package, UserRound } from "lucide-react";

import { urls } from "@workspace/ui/lib/company";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarRail,
} from "@workspace/ui/components/sidebar";

import { NavPages } from "./nav-pages";
import { NotificationBell } from "./notification-bell";

// This is sample data.
const pages = [
  {
    title: "Portal",
    url: "/portal",
    icon: LayoutDashboard,
  },
  {
    title: "Orders",
    url: "/portal/orders",
    icon: Package,
  },
  {
    title: "Customer",
    url: `${urls.portfolio}/settings`,
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
