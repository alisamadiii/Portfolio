"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
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
import { EmbedHistoryNotifications } from "@workspace/ui/custom/embed-history-notifications";
import { RequestDialog } from "@workspace/ui/custom/request-dialog";

import { useTRPC } from "@workspace/trpc/client";
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
    title: "Subscription",
    url: "/agency",
    icon: LayoutDashboard,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const logout = useLogout();
  const router = useRouter();
  const trpc = useTRPC();
  const { data: notifications } = useQuery(
    trpc.notification.history.queryOptions()
  );
  const unreadCount =
    notifications?.filter(
      (n) => n.status === "REPLIED" || n.status === "PENDING"
    ).length ?? 0;

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
            <SidebarMenuItem>
              <Sheet>
                <SheetTrigger asChild>
                  <SidebarMenuButton className="relative py-4">
                    <Bell />
                    <span>Notification History</span>
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 left-1.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Notifications</SheetTitle>
                    <SheetDescription>
                      Your support request history and updates.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto">
                    <EmbedHistoryNotifications project="PORTFOLIO" />
                  </div>
                </SheetContent>
              </Sheet>
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
