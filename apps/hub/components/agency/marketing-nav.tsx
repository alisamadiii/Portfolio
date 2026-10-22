"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@workspace/ui/lib/utils";

import { ChartColumn, Search, Target, Wallet } from "@/components/icon";

const ITEMS = [
  { title: "Overview", url: "/marketing", icon: ChartColumn },
  { title: "Conversions", url: "/marketing/conversions", icon: Target },
  { title: "Budget", url: "/marketing/budget", icon: Wallet },
  { title: "Search terms", url: "/marketing/search-terms", icon: Search },
];

/** Marketing's own sections: a left column on desktop, tabs on mobile. */
export function MarketingNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto lg:sticky lg:top-6 lg:w-52 lg:shrink-0 lg:flex-col lg:self-start">
      {ITEMS.map((item) => {
        const active = pathname === item.url;
        return (
          <Link
            key={item.url}
            href={item.url}
            className={cn(
              "text-muted-foreground hover:bg-foreground/6 hover:text-foreground flex shrink-0 items-center gap-2.5 rounded-full px-4 py-2.5 text-[14px] font-medium transition-colors",
              active && "bg-foreground/8 text-foreground font-semibold"
            )}
          >
            <item.icon className="size-4" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
