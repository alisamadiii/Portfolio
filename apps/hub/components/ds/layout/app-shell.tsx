"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Sheet, SheetContent, SheetTitle } from "@workspace/ui/components/sheet";
import { cn } from "@workspace/ui/lib/utils";

const NavDrawerContext = createContext<{ open: () => void } | null>(null);

/** Opens the phone nav drawer (null outside AppShell). */
export const useNavDrawer = () => useContext(NavDrawerContext);

/**
 * Page frame: sticky TopBar on top, then Sidebar + main.
 * Desktop (md+): sidebar is a sticky full-height column. Phones: the sidebar
 * lives in a left drawer opened from the top bar's menu button.
 * main: padding 32/40/48, inner column max-w 1120 centered, 20px gap between blocks.
 */
export function AppShell({
  topBar,
  sidebar,
  children,
  wide,
  bleed,
}: {
  topBar: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
  /** Business info steps use the full width. */
  wide?: boolean;
  /** Edge to edge, one viewport tall (the page scrolls inside itself): Calendar. */
  bleed?: boolean;
}) {
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();
  // Navigating from the drawer closes it.
  useEffect(() => setDrawer(false), [pathname]);

  return (
    <NavDrawerContext.Provider value={{ open: () => setDrawer(true) }}>
      <div
        className={cn(
          "flex flex-col bg-canvas font-sans text-sm text-ink",
          bleed ? "h-dvh overflow-hidden" : "min-h-screen"
        )}
      >
        {topBar}
        <div className={cn("flex flex-1", bleed && "min-h-0")}>
          <div className="hidden w-[232px] shrink-0 md:flex">{sidebar}</div>
          {bleed ? (
            <main className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>
          ) : (
            <main className="min-w-0 flex-1 px-4 pb-12 pt-6 sm:px-10 sm:pt-8">
              <div className={wide ? "flex flex-col gap-5" : "mx-auto flex max-w-[1120px] flex-col gap-5"}>
                {children}
              </div>
            </main>
          )}
        </div>
      </div>
      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="left" className="w-[280px] gap-0 p-0 [&>nav]:h-full [&>nav]:border-r-0 [&>nav]:pt-12">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>
    </NavDrawerContext.Provider>
  );
}

/** Two-column body used by Business info steps & Apps: content (grows) + 300–360px side column. Stacks on phones. */
export function WithSide({ children, side }: { children: ReactNode; side: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-5">
      <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-4">{children}</div>
      <aside className="flex max-w-[360px] flex-[1_1_300px] flex-col gap-4">{side}</aside>
    </div>
  );
}
