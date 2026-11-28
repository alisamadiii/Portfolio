"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, CircleHelp, Lock } from "lucide-react";

import { RequestDialog } from "@workspace/ui/custom/request-dialog";
import { cn } from "@workspace/ui/lib/utils";

import { isNewNav, type NavItem } from "@/lib/apps";

// Every row: same 34px box, same 20px icon slot, same hover. shrink-0 because
// the nav is a fixed-height flex column: without it rows squash before the
// nav scrolls.
const linkClass = (active?: boolean, muted?: boolean) =>
  cn(
    "flex h-[34px] w-full shrink-0 items-center gap-2.5 rounded-control px-2.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral",
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
      className={linkClass(active, muted)}
    >
      <span className="flex size-5 shrink-0 items-center justify-center" aria-hidden>
        {Logo ? (
          <Logo className="size-[19px]" />
        ) : item.tile && Icon ? (
          <span className="flex size-[19px] items-center justify-center rounded-[5px] bg-coral text-white">
            <Icon className="size-3.5" strokeWidth={2.2} />
          </span>
        ) : (
          Icon && (
            <Icon className={cn("size-4", active && "text-coral")} strokeWidth={active ? 2 : 1.8} />
          )
        )}
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {isNewNav(item.addedAt) && (
        <span className="shrink-0 rounded bg-coral-soft px-1.5 py-px text-[11px] font-medium text-coral-deep">New</span>
      )}
      {item.external && <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />}
      {item.adminOnly && (
        <Lock className="size-3.5 shrink-0 text-faint" aria-label="Admins only">
          <title>Admins only</title>
        </Lock>
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
        <div className="shrink-0 px-2.5 pt-4 pb-1.5 text-xs font-medium text-dim">
          {label}
        </div>
      )}
      {children}
    </>
  );
}

export const SidebarDivider = () => (
  <div className="mx-2.5 my-3 h-px shrink-0 bg-line" />
);

/** Bottom "Contact support" row: opens the support request dialog (which renders the <button>). */
function SupportLink() {
  return (
    <RequestDialog>
      <span className={linkClass()}>
        <span className="flex size-5 shrink-0 items-center justify-center" aria-hidden>
          <CircleHelp className="size-4" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1 truncate">Contact support</span>
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
