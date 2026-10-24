"use client";

import { ChartColumn, Search, Target, Wallet } from "@/components/icon";
import { SubSidebar } from "@/components/sub-sidebar";

const ITEMS = [
  { title: "Overview", url: "/marketing", icon: ChartColumn },
  { title: "Conversions", url: "/marketing/conversions", icon: Target },
  { title: "Budget", url: "/marketing/budget", icon: Wallet },
  { title: "Search terms", url: "/marketing/search-terms", icon: Search },
];

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      <SubSidebar items={ITEMS} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
