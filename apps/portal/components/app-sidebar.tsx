"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Globe,
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar";
import { RequestDialog } from "@workspace/ui/custom/request-dialog";
import { logos, urls } from "@workspace/ui/lib/company";

import { useLogout } from "@workspace/auth/hooks/use-functions";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

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

const menuButtonClass =
  "h-auto gap-3 rounded-[14px] px-3.5 py-2.5 text-[14.5px] font-medium hover:bg-sidebar-foreground/8 hover:text-sidebar-accent-foreground [&>svg]:size-[19px]";

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const logout = useLogout();
  const router = useRouter();

  return (
    <Sidebar {...props}>
      <SidebarHeader className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3.5">
          <img
            src={logos.default}
            alt="Ali Samadi"
            className="size-11.5 shrink-0 rounded-full object-cover"
          />
          <div>
            <p className="text-sidebar-accent-foreground text-xl leading-none font-extrabold tracking-tight">
              Portal
            </p>
            <p className="text-sidebar-foreground/70 mt-1 text-[11.5px]">
              Client Workspace
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1.5">
        <NavPages label="Account" pages={accountPages} />
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="text-sidebar-foreground/60 px-3 text-[11px] font-semibold tracking-[0.06em] uppercase">
            Agency
          </SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={menuButtonClass}
                render={<a href={urls.cms} />}
              >
                <Globe />
                <span>Go to Hub</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="text-sidebar-foreground/60 px-3 text-[11px] font-semibold tracking-[0.06em] uppercase">
            Support
          </SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <RequestDialog>
                <SidebarMenuButton className={menuButtonClass}>
                  <HelpCircle />
                  <span>Contact Support</span>
                </SidebarMenuButton>
              </RequestDialog>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border gap-1 border-t p-3.5">
        <SidebarUser />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className={menuButtonClass}
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

const SidebarUser = () => {
  const { data: user } = useCurrentUser();

  if (!user?.user) return null;

  return (
    <div className="flex items-center gap-3 px-2.5 py-2 group-data-[collapsible=icon]:hidden">
      <div className="bg-sidebar-foreground/12 text-sidebar-accent-foreground grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold">
        {getInitials(user.user.name || user.user.email)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sidebar-accent-foreground truncate text-sm font-semibold">
          {user.user.name}
        </p>
        <p className="text-sidebar-foreground/70 truncate text-xs">
          {user.user.email}
        </p>
      </div>
    </div>
  );
};
