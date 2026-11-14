"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, CircleHelp, Lock } from "lucide-react";

import { RequestDialog } from "@workspace/ui/custom/request-dialog";
import { cn } from "@workspace/ui/lib/utils";

import type { NavItem } from "@/lib/apps";

const linkClass = (active?: boolean, muted?: boolean) =>
  cn(
    "flex h-[34px] w-full items-center gap-2.5 rounded-control px-2.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral",
    active
      ? "bg-selected font-medium text-ink"
      : muted
        ? "text-dim hover:bg-hover"
        : "text-ink-2 hover:bg-hover hover:text-ink"
  );

/**
 * 232px sidebar on sidebar tint. Items 34px, 14px text, 16px icons (stroke 1.8).
 * Active item: selected bg + 500 weight + CORAL icon. No left border bars.
 * Desktop: sticky under the 56px top bar, full viewport height, scrolls on its
 * own. Phones: rendered inside AppShell's left drawer.
 */
export function SidebarLink({
  item,
  href,
  active,
  muted,
}: {
  item: NavItem;
  href: string;
  active?: boolean;
  muted?: boolean;
}) {
  const Icon = item.icon;
  const Logo = item.logo;
  return (
    <Link
      href={href}
      target={item.external ? "_blank" : undefined}
      rel={item.external ? "noopener noreferrer" : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        linkClass(active, muted),
        item.external && "justify-between"
      )}
    >
      {item.external ? (
        <>
          <span>{item.label}</span>
          <ArrowUpRight className="size-3.5" aria-hidden />
        </>
      ) : (
        <>
          {Logo ? (
            <Logo className="size-4" />
          ) : (
            Icon && (
              <Icon
                className={cn("size-4", active && "text-coral")}
                strokeWidth={active ? 2 : 1.8}
                aria-hidden
              />
            )
          )}
          {item.label}
          {item.adminOnly && (
            <Lock className="ml-auto size-3.5 text-faint" aria-label="Admins only">
              <title>Admins only</title>
            </Lock>
          )}
        </>
      )}
    </Link>
  );
}

export function SidebarSection({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <>
      {label && (
        <div className="text-dim px-2.5 pt-4 pb-1.5 text-xs font-medium">
          {label}
        </div>
      )}
      {children}
    </>
  );
}

export const SidebarDivider = () => (
  <div className="bg-line mx-2.5 my-3 h-px" />
);

/** Bottom "Contact support" row: opens the support request dialog (which renders the <button>). */
function SupportLink() {
  return (
    <RequestDialog>
      <span className={linkClass()}>
        <CircleHelp className="size-4" strokeWidth={1.8} aria-hidden />
        Contact support
      </span>
    </RequestDialog>
  );
}

export function Sidebar({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <nav
      aria-label={label}
      className="border-line bg-sidebar flex w-full flex-col gap-0.5 self-start overflow-y-auto border-r px-3 py-4 md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)]"
    >
      {children}
      <div className="min-h-6 flex-1" />
      <SupportLink />
    </nav>
  );
}

/** Helper: is this path the current page? Home ("" path) must match exactly. */
export function useIsActive() {
  const pathname = usePathname() ?? "";
  return (href: string, exact = false) => {
    const path = href.split("?")[0] ?? href;
    return exact
      ? pathname === path
      : pathname === path || pathname.startsWith(path + "/");
  };
}
