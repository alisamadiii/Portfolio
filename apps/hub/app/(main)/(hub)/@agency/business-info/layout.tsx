"use client";

import {
  BUSINESS_SECTIONS,
  sectionUrl,
} from "@/components/agency/business-info-config";
import { DocumentTitle } from "@/components/document-title";
import {
  Building2,
  Megaphone,
  Sparkles,
  Users,
  type LucideProps,
} from "@/components/icon";
// Line icons the hub wrapper doesn't carry, matching the sidebar convention.
import { MessagesSquare, Quote, Tags } from "lucide-react";
import { SubSidebar, type SubSidebarGroup } from "@/components/sub-sidebar";

const SECTION_ICONS: Record<string, React.ComponentType<LucideProps>> = {
  business: Building2,
  segments: Users,
  messaging: MessagesSquare,
  taglines: Quote,
  purpose: Sparkles,
  keywords: Tags,
  "search-ad": Megaphone,
};

// Group the nav by each section's config group ("Google Ads" vs the default),
// preserving section order inside each group.
const GROUPS: SubSidebarGroup[] = [];
for (const section of BUSINESS_SECTIONS) {
  const label = section.group ?? "Business";
  const url = sectionUrl(section.key);
  const group =
    GROUPS.find((g) => g.label === label) ??
    (GROUPS[GROUPS.push({ label, items: [] }) - 1] as SubSidebarGroup);
  group.items.push({
    title: section.title,
    url,
    icon: SECTION_ICONS[section.key],
    // Keywords stays lit on campaign detail pages. The index route can't use
    // startsWith: "/business-info" is a prefix of every other page.
    match:
      section.key === "keywords"
        ? (pathname) => pathname === url || pathname.startsWith(`${url}/`)
        : undefined,
  });
}

export default function BusinessInfoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <DocumentTitle title="Business Information" />
      <div>
        <h2 className="text-[27px] font-extrabold tracking-tight">
          Business Information
        </h2>
        <p className="text-muted-foreground mt-1 max-w-3xl text-[14.5px]">
          Fill this in once, section by section. Every prompt below auto-fills
          from your saved answers, so you can copy it straight into ChatGPT. We
          reuse everything here across your website, ads, and campaigns.
        </p>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <SubSidebar groups={GROUPS} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
