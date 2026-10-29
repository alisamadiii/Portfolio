"use client";

import type { SVGProps } from "react";

import { cn } from "@workspace/ui/lib/utils";

import { AgencyBillingPage } from "@/components/agency/settings/billing-page";
import { AgencyDangerPage } from "@/components/agency/settings/danger-page";
import { AgencyDomainPage } from "@/components/agency/settings/domain-page";
import { AgencySpeedPage } from "@/components/agency/settings/speed-page";
import { SpeedMark } from "@/components/analytics/speed-mark";
import { CreditCard, Globe, TriangleAlert } from "@/components/icon";
import { ProjectFeatureGate } from "@/components/settings/project-paywall";

const DangerIcon = ({ className }: SVGProps<SVGSVGElement>) => (
  <TriangleAlert className={cn("text-destructive", className)} />
);

/**
 * Agency projects' Site settings (sidebar group → /p/[projectId]/settings/[key]).
 * Its own pages, separate from the website editor's Settings tab
 * (components/settings/*), so agency settings can change on their own.
 * Analytics is the agency's own page; emails are covered by leads; origins
 * live on the Domain page.
 */
export const SITE_SETTINGS = [
  { key: "billing", title: "Billing", icon: CreditCard },
  { key: "domain", title: "Domain", icon: Globe },
  { key: "speed", title: "Speed", icon: SpeedMark },
  { key: "danger", title: "Danger", icon: DangerIcon },
] as const;

export type SiteSettingKey = (typeof SITE_SETTINGS)[number]["key"];

export const siteSetting = (key: string) =>
  SITE_SETTINGS.find((setting) => setting.key === key);

export function SiteSettingPage({ section }: { section: SiteSettingKey }) {
  switch (section) {
    case "billing":
      return <AgencyBillingPage />;
    case "domain":
      return <AgencyDomainPage />;
    case "speed":
      return (
        <ProjectFeatureGate feature="speed">
          <AgencySpeedPage />
        </ProjectFeatureGate>
      );
    case "danger":
      return <AgencyDangerPage />;
  }
}
