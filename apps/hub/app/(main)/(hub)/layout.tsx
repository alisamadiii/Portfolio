"use client";

import { usePathname } from "next/navigation";

import { AccountSidebar } from "@/components/ds/layout/account-sidebar";
import { AppShell } from "@/components/ds/layout/app-shell";
import { TopBar } from "@/components/ds/layout/top-bar";

export default function HubLayout({ children }: { children: React.ReactNode }) {
  // A client website preview fills the viewport (the site scrolls inside its frame).
  const bleed = /^\/client-websites\/[^/]+/.test(usePathname() ?? "");
  return (
    <AppShell topBar={<TopBar />} sidebar={<AccountSidebar />} bleed={bleed}>
      {children}
    </AppShell>
  );
}
