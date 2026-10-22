"use client";

import * as React from "react";

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

import type { Feature } from "@workspace/trpc/lib/payment/plans";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { signOut } from "@/lib/auth-client";
import { getInitialsFromName } from "@/lib/utils/avatar";
import { useEntitlement } from "@/hooks/use-plans";

import { AdsAlertCount } from "@/components/agency/ads-alerts";
import { CampaignFilterSelect } from "@/components/agency/campaign-filter";
import { useAgency } from "@/components/agency/use-agency";
import {
  Blocks,
  BookOpen,
  ChartColumn,
  FileText,
  CreditCard,
  HelpCircle,
  House,
  Inbox,
  LogOut,
  Mail,
  Megaphone,
  Settings,
} from "@/components/icon";
import { NavPages } from "@/components/nav-pages";

// Pages tied to a plan feature only show when the client's tier includes it.
const overviewPages: {
  title: string;
  url: string;
  icon: typeof House;
  feature?: Feature;
  badge?: React.ReactNode;
  items?: {
    title: string;
    url: string;
    match?: (pathname: string) => boolean;
  }[];
}[] = [
  { title: "Home", url: "/", icon: House },
  {
    title: "Lead trackers",
    url: "/agency",
    icon: Inbox,
    feature: "leads",
    items: [
      {
        title: "Quote form",
        url: "/agency",
        // The inbox and each lead's detail page.
        match: (pathname) =>
          pathname === "/agency" || /^\/agency\/\d+$/.test(pathname),
      },
      { title: "Booking", url: "/agency/booking" },
      { title: "Calls", url: "/agency/calls" },
    ],
  },
  {
    title: "Marketing",
    url: "/marketing",
    icon: Megaphone,
    feature: "ads",
    badge: <AdsAlertCount />,
  },
  { title: "Analytics", url: "/analytics", icon: ChartColumn },
  { title: "Reports", url: "/reports", icon: FileText, feature: "leads" },
  {
    title: "Newsletter",
    url: "/newsletter",
    icon: Mail,
    feature: "newsletter",
  },
];

const accountPages = [
  { title: "Account", url: "/account", icon: Settings },
  { title: "Integrations", url: "/integrations", icon: Blocks },
  { title: "Billing", url: "/billing", icon: CreditCard },
  { title: "Guide", url: "/guide", icon: BookOpen },
];

const menuButtonClass =
  "h-auto gap-3 rounded-[14px] px-3.5 py-2.5 text-[14.5px] font-medium hover:bg-sidebar-foreground/8 hover:text-sidebar-accent-foreground [&>svg]:size-[19px]";

export function AgencySidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { repoId } = useAgency();
  const { can } = useEntitlement(repoId);
  const pages = overviewPages.filter(
    (page) => !page.feature || can(page.feature)
  );

  return (
    <Sidebar {...props}>
      <SidebarHeader className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3.5">
          <img
            src="/agency-icon.png"
            alt="Ali Samadi"
            className="size-11.5 shrink-0 object-cover"
          />
          <div>
            <p className="text-sidebar-accent-foreground text-xl leading-none font-extrabold tracking-tight">
              Client Hub
            </p>
            <p className="text-sidebar-foreground/70 mt-1 text-[11.5px]">
              Your leads and ads, one place
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1.5">
        {can("ads") && <CampaignFilterSelect />}
        <NavPages label="Overview" pages={pages} />
        <NavPages label="Account" pages={accountPages} />
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
              onClick={async () => {
                await signOut();
                window.location.assign("/sign-in");
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
        {getInitialsFromName(user.user.name || user.user.email)}
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
