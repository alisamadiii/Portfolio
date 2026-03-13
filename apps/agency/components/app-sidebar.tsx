"use client";

import * as React from "react";
import { HelpCircle, LayoutDashboard, Package, UserRound } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@workspace/ui/components/sidebar";

import { NavPages } from "./nav-pages";

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
    url: "/portal/customer",
    icon: UserRound,
  },
  {
    title: "Support",
    url: "/portal/support",
    icon: HelpCircle,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarContent>
        <NavPages pages={pages} />
      </SidebarContent>
      <SidebarFooter></SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
