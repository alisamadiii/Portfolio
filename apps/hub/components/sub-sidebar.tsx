"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@workspace/ui/lib/utils";

import type { LucideProps } from "@/components/icon";

export interface SubSidebarItem {
  title: string;
  url: string;
  icon?: React.ComponentType<LucideProps>;
  /** Active check when it's more than "same URL" (e.g. detail pages). */
  match?: (pathname: string) => boolean;
  badge?: React.ReactNode;
}

export interface SubSidebarGroup {
  label?: string;
  items: SubSidebarItem[];
}

/**
 * A page-local second sidebar: a white panel with the main sidebar's exact
 * button recipe. Left column on desktop, horizontal scroll row on mobile
 * (where group labels hide and the groups flatten into one row).
 * Reused by any page with its own sub-pages (Business Info, Marketing, …).
 * Pass `items` for a single unlabeled group, or `groups` for labeled ones.
 */
export function SubSidebar({
  label,
  items,
  groups,
}: {
  label?: string;
  items?: SubSidebarItem[];
  groups?: SubSidebarGroup[];
}) {
  const pathname = usePathname();
  const resolved: SubSidebarGroup[] = groups ?? [{ label, items: items ?? [] }];

  return (
    <nav className="bg-sidebar flex gap-1 overflow-x-auto rounded-2xl border p-2 lg:sticky lg:top-6 lg:w-56 lg:shrink-0 lg:flex-col lg:self-start">
      {resolved.map((group, g) => (
        <div key={group.label ?? g} className="contents lg:block">
          {group.label && (
            <p
              className={`text-sidebar-foreground/60 hidden px-3 pb-2 text-[11px] font-semibold tracking-[0.06em] uppercase lg:block ${
                g === 0 ? "pt-1" : "pt-4"
              }`}
            >
              {group.label}
            </p>
          )}
          <div className="contents lg:flex lg:flex-col lg:gap-1">
            {group.items.map((item) => (
              <SubSidebarLink key={item.url} item={item} pathname={pathname} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SubSidebarLink({
  item,
  pathname,
}: {
  item: SubSidebarItem;
  pathname: string;
}) {
  const active = item.match ? item.match(pathname) : pathname === item.url;
  return (
    <Link
      href={item.url}
      className={cn(
        "text-sidebar-foreground flex shrink-0 items-center gap-3 rounded-[14px] border-l-2 border-l-transparent px-3.5 py-2.5 text-[14.5px] font-medium [&>svg]:size-[19px] [&>svg]:shrink-0",
        "hover:bg-sidebar-foreground/8 hover:text-sidebar-accent-foreground",
        active &&
          "bg-sidebar-accent text-sidebar-accent-foreground border-l-sidebar-ring hover:bg-sidebar-accent font-semibold"
      )}
    >
      {item.icon && <item.icon />}
      <span>{item.title}</span>
      {item.badge && (
        <span className="ml-auto flex items-center">{item.badge}</span>
      )}
    </Link>
  );
}
