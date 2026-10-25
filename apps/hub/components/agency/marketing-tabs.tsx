"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import { useAdsProduct } from "@/components/agency/ads-product";
import { lastDays } from "@/components/agency/lead-status";
import { useAgency } from "@/components/agency/use-agency";

const SEARCH_TABS = [
  { title: "Overview", href: "/marketing" },
  { title: "Conversions", href: "/marketing/conversions" },
  { title: "Budget", href: "/marketing/budget" },
  { title: "Search terms", href: "/marketing/search-terms" },
];

const LSA_TABS = [
  { title: "Overview", href: "/marketing" },
  { title: "Local Services", href: "/marketing/lsa" },
];

/** Count of search terms with spend but no conversions — the red tab badge. */
function useWastedCount(enabled: boolean) {
  const trpc = useTRPC();
  const { repoId, adsConnected } = useAgency();
  const range = useMemo(() => lastDays(30), []);
  const list = useQuery(
    trpc.agency.ads.searchTerms.list.queryOptions(
      { repoId, ...range },
      { enabled: enabled && adsConnected, retry: false, staleTime: 5 * 60_000 }
    )
  );
  return (
    list.data?.rows.filter((row) => row.costCents > 0 && row.conversions === 0)
      .length ?? 0
  );
}

export function MarketingTabs() {
  const pathname = usePathname();
  const { product } = useAdsProduct();
  const TABS = product === "lsa" ? LSA_TABS : SEARCH_TABS;
  const wasted = useWastedCount(product === "search");

  return (
    <nav
      aria-label="Marketing sections"
      className="border-foreground/10 flex flex-wrap gap-7 border-b"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        const badge = tab.href === "/marketing/search-terms" && wasted > 0;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex items-center gap-2 border-b-2 pb-[14px] text-[16px]",
              active
                ? "border-foreground text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground border-transparent font-medium"
            )}
          >
            {tab.title}
            {badge && (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#f8e6e7] px-[7px] text-[12px] font-semibold text-[#a3283a] tabular-nums">
                {wasted}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
