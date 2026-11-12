import type { ReactNode } from "react";

/**
 * Page frame: TopBar on top, then a wrapping row of Sidebar + main.
 * main: flex 999 1 560px, padding 32/40/48, inner column max-w 1120 centered, 20px gap between blocks.
 * Never sticky, never 100vh: on phones the sidebar stacks above the content.
 */
export function AppShell({
  topBar,
  sidebar,
  children,
  wide,
}: {
  topBar: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
  /** Business info steps use the full width. */
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas font-sans text-sm text-ink">
      {topBar}
      <div className="flex flex-1 flex-wrap">
        {sidebar}
        <main className="min-w-0 flex-[999_1_560px] px-5 pb-12 pt-8 sm:px-10">
          <div className={wide ? "flex flex-col gap-5" : "mx-auto flex max-w-[1120px] flex-col gap-5"}>
            {children}
          </div>
        </main>
      </div>
    </div>
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
