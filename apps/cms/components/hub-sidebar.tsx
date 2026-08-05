"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Bot,
  CreditCard,
  Globe,
  HelpCircle,
  House,
  LogOut,
  Mail,
  Megaphone,
  PenLine,
  Settings,
} from "lucide-react";

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
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { signOut } from "@/lib/auth-client";
import { getInitialsFromName } from "@/lib/utils/avatar";

import { CmsProjectsDialog } from "./cms-projects-dialog";
import { NavPages } from "./nav-pages";
import { StatusDot } from "./status-dot";

const overviewPages = [
  {
    title: "Home",
    url: "/",
    icon: House,
  },
];

const accountPages = [
  {
    title: "Billing",
    url: "/billing",
    icon: CreditCard,
  },
  {
    title: "Emails",
    url: "/emails",
    icon: Mail,
  },
  {
    title: "Marketing",
    url: "/marketing",
    icon: Megaphone,
    badge: (
      <span className="bg-status-warning-bg text-status-warning rounded-full px-2 py-0.5 text-[10.5px] font-semibold">
        Soon
      </span>
    ),
  },
];

// Aggregate status for the Website nav item: green when every site is up,
// red when any is down, nothing while loading or when the client has no site.
// Shares the getMine query key with the /website page, so no extra request.
const WebsiteStatusDot = () => {
  const trpc = useTRPC();
  const { data: currentUser } = useCurrentUser();
  const { data: sites } = useQuery(
    trpc.websites.getMine.queryOptions(undefined, { enabled: !!currentUser })
  );

  if (!sites?.length) return null;
  const allUp = sites.every((site) => site.status.up);

  return <StatusDot up={allUp} className="size-2" />;
};

const menuButtonClass =
  "h-auto gap-3 rounded-[14px] px-3.5 py-2.5 text-[14.5px] font-medium hover:bg-sidebar-foreground/8 hover:text-sidebar-accent-foreground [&>svg]:size-[19px]";

// The Website group is hand-rolled (instead of NavPages) because the CMS item
// is a dialog trigger, not a link — the project list must only mount, and
// therefore only fetch, while the dialog is open.
const WebsiteGroup = () => {
  const pathname = usePathname();

  const linkClass = (url: string) =>
    cn(
      // overflow-visible overrides the base overflow-hidden so the status
      // dot's ping animation isn't clipped by the button bounds
      "h-auto gap-3 overflow-visible rounded-[14px] border-l-2 border-l-transparent px-3.5 py-2.5 text-[14.5px] font-medium [&>svg]:size-[19px]",
      "hover:bg-sidebar-foreground/8 hover:text-sidebar-accent-foreground",
      pathname === url &&
        "bg-sidebar-accent text-sidebar-accent-foreground border-l-sidebar-ring hover:bg-sidebar-accent font-semibold"
    );

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="text-sidebar-foreground/60 px-3 text-[11px] font-semibold tracking-[0.06em] uppercase">
        Website
      </SidebarGroupLabel>
      <SidebarMenu className="gap-0.5">
        <SidebarMenuItem>
          <CmsProjectsDialog>
            <SidebarMenuButton className={menuButtonClass}>
              <PenLine />
              <span>Content (CMS)</span>
            </SidebarMenuButton>
          </CmsProjectsDialog>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            className={linkClass("/website")}
            render={<Link href="/website" />}
          >
            <Globe />
            <span>Website</span>
            <span className="ml-auto flex items-center">
              <WebsiteStatusDot />
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            className={linkClass("/requests")}
            render={<Link href="/requests" />}
          >
            <Bot />
            <span>AI Requests</span>
            <span className="bg-status-warning-bg text-status-warning ml-auto rounded-full px-2 py-0.5 text-[10.5px] font-semibold">
              Soon
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
};

export function HubSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3.5">
          <img
            src={logos.green}
            alt="Ali Samadi"
            className="size-11.5 shrink-0 rounded-full object-cover"
          />
          <div>
            <p className="text-sidebar-accent-foreground text-xl leading-none font-extrabold tracking-tight">
              Client Hub
            </p>
            <p className="text-sidebar-foreground/70 mt-1 text-[11.5px]">
              Your website, one place
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1.5">
        <NavPages label="Overview" pages={overviewPages} />
        <WebsiteGroup />
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
              render={<a href={urls.portal} />}
            >
              <Settings />
              <span>Portal</span>
              <ArrowUpRight className="ml-auto size-3.5 opacity-60" />
            </SidebarMenuButton>
          </SidebarMenuItem>
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
