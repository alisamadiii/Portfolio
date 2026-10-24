"use client";

import {
  BUSINESS_SECTIONS,
  sectionUrl,
} from "@/components/agency/business-info-config";
import { DocumentTitle } from "@/components/document-title";
import { Building2, Sparkles, Users, type LucideProps } from "@/components/icon";
// Line icons the hub wrapper doesn't carry, matching the sidebar convention.
import { MessagesSquare, Quote } from "lucide-react";
import { SubSidebar } from "@/components/sub-sidebar";

const SECTION_ICONS: Record<string, React.ComponentType<LucideProps>> = {
  business: Building2,
  segments: Users,
  messaging: MessagesSquare,
  taglines: Quote,
  purpose: Sparkles,
};

const ITEMS = BUSINESS_SECTIONS.map((section) => ({
  title: section.title,
  url: sectionUrl(section.key),
  icon: SECTION_ICONS[section.key],
}));

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
        <SubSidebar items={ITEMS} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
