"use client";

import * as React from "react";
import Link from "next/link";
// Home + Reports use the plain line icons (lucide), matching the other nav
// items; the hub-local House/FileText are the filled two-tone variants.
import { FileText, House } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar";
import { RequestDialog } from "@workspace/ui/custom/request-dialog";

import type { Feature } from "@workspace/trpc/lib/payment/plans";

import { repoPath } from "@/lib/paths";
import { useEntitlement } from "@/hooks/use-plans";

import { AdsAlertCount } from "@/components/agency/ads-alerts";
import {
  AdsProductSwitch,
  useAdsProduct,
} from "@/components/agency/ads-product";
import { CampaignFilterSelect } from "@/components/agency/campaign-filter";
import {
  ProjectNav,
  type ProjectNavPage,
} from "@/components/agency/project-nav";
import { SITE_SETTINGS } from "@/components/agency/settings/site-settings";
import { useAgency } from "@/components/agency/use-agency";
import {
  ArrowLeft,
  Building2,
  ChartColumn,
  HelpCircle,
  Inbox,
  Mail,
  Megaphone,
  PenLine,
} from "@/components/icon";
import { AdminViewSwitch } from "@/components/shell/admin-view-switch";

type NavPage = ProjectNavPage & { feature?: Feature };

// Pages tied to a plan feature only show when the client's tier includes it.
// Every agency page lives under its project: /p/[projectId]/...
const overviewPages = (projectId: string, hasSite: boolean): NavPage[] => {
  const path = (...segments: string[]) => repoPath(projectId, ...segments);
  return [
    { title: "Home", url: path(), icon: House, exact: true },
    {
      title: "Lead trackers",
      url: path("agency"),
      icon: Inbox,
      feature: "leads",
      items: [
        {
          // Forms, bookings and hand-added leads all land here.
          title: "All leads",
          url: path("agency"),
          // The inbox and each lead's detail page.
          match: (pathname) =>
            pathname === path("agency") ||
            new RegExp(`^${path("agency")}/\\d+$`).test(pathname),
        },
        { title: "Booking", url: path("agency", "booking") },
        { title: "Calls", url: path("agency", "calls") },
      ],
    },
    {
      title: "Marketing",
      url: path("marketing"),
      icon: Megaphone,
      feature: "ads",
      badge: <AdsAlertCount />,
    },
    { title: "Analytics", url: path("analytics"), icon: ChartColumn },
    {
      title: "Reports",
      url: path("reports"),
      icon: FileText,
      feature: "leads",
    },
    { title: "Business Info", url: path("business-info"), icon: Building2 },
    {
      title: "Newsletter",
      url: path("newsletter"),
      icon: Mail,
      feature: "newsletter",
    },
    ...(hasSite
      ? [{ title: "Website", url: path("website"), icon: PenLine }]
      : []),
  ];
};

export function AgencySidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { projectId, repo, hasSite, role } = useAgency();
  const { entitlement, can } = useEntitlement(projectId);
  const { product } = useAdsProduct();
  const pages = overviewPages(projectId, hasSite).filter(
    (page) => !page.feature || can(page.feature)
  );

  return (
    <Sidebar {...props}>
      <SidebarHeader className="gap-0 px-2 pt-3 pb-2">
        <div className="flex items-center gap-2 rounded-md px-1 py-1">
          <Link
            href="/"
            title="All projects"
            aria-label="All projects"
            className="text-sidebar-foreground/60 hover:bg-sidebar-foreground/6 hover:text-sidebar-accent-foreground grid size-7 shrink-0 place-items-center rounded-md"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <span className="bg-sidebar-accent-foreground text-sidebar grid size-7 shrink-0 place-items-center rounded-md text-[12px] font-bold uppercase">
            {repo?.[0] ?? "P"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sidebar-accent-foreground truncate text-[13px] leading-tight font-semibold">
              {repo}
            </p>
            <p className="text-sidebar-foreground/60 truncate text-[11px] leading-tight">
              {entitlement.label}
            </p>
          </div>
        </div>
        <AdminViewSwitch
          projectId={projectId}
          current="agency"
          className="mx-1 mt-2"
        />
      </SidebarHeader>

      <SidebarContent className="gap-1">
        {can("ads") && <AdsProductSwitch />}
        {can("ads") && product === "search" && <CampaignFilterSelect />}
        <ProjectNav pages={pages} />
        {role === "full-access" && (
          <ProjectNav
            label="Site settings"
            pages={SITE_SETTINGS.map((setting) => ({
              title: setting.title,
              url: repoPath(projectId, "settings", setting.key),
              icon: setting.icon,
            }))}
          />
        )}
      </SidebarContent>

      <SidebarFooter className="px-2 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <RequestDialog>
              <SidebarMenuButton className="text-sidebar-foreground/70 hover:bg-sidebar-foreground/6 hover:text-sidebar-accent-foreground h-8 gap-2 rounded-md px-2 text-[13px] font-medium [&>svg]:size-4">
                <HelpCircle />
                <span>Contact support</span>
              </SidebarMenuButton>
            </RequestDialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
