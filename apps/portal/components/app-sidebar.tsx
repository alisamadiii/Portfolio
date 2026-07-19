"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Building2,
  CreditCard,
  HelpCircle,
  LogOut,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from "@workspace/ui/components/sidebar";
import { RequestDialog } from "@workspace/ui/custom/request-dialog";

import { useLogout } from "@workspace/auth/hooks/use-functions";

import { NavPages } from "./nav-pages";

const accountPages = [
  {
    title: "Settings",
    url: "/",
    icon: Settings,
  },
  {
    title: "Billing",
    url: "/billing",
    icon: CreditCard,
  },
];

const agencyPages = [
  {
    title: "Agency",
    url: "/agency",
    icon: Building2,
  },
  {
    title: "AI Requests",
    url: "/requests",
    icon: Bot,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const logout = useLogout();
  const router = useRouter();

  return (
    <Sidebar {...props}>
      <SidebarContent>
        <NavPages label="Account" pages={accountPages} />
        <NavPages label="Agency" pages={agencyPages} />
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Support</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <RequestDialog>
                <SidebarMenuButton className="py-4">
                  <HelpCircle />
                  <span>Contact Support</span>
                </SidebarMenuButton>
              </RequestDialog>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                logout.mutate(undefined, {
                  onSuccess: () => {
                    toast.success("Logged out successfully");
                    router.push("/login");
                  },
                  onError: (error) => {
                    toast.error(error.message);
                  },
                });
              }}
            >
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
