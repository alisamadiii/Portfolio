import { SidebarProvider } from "@workspace/ui/components/sidebar";

import { SessionRefreshProvider } from "@workspace/auth/providers/session-refresh-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { PortalHeader } from "@/components/header";
import { ProtectRoute } from "@/components/protect-route";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectRoute>
      <SessionRefreshProvider>
        <SidebarProvider style={{ "--sidebar-width": "18.5rem" } as React.CSSProperties}>
          <AppSidebar />
          <main className="w-full flex-1">
            <PortalHeader />
            <div className="max-w-[860px] p-6 md:p-10">{children}</div>
          </main>
        </SidebarProvider>
      </SessionRefreshProvider>
    </ProtectRoute>
  );
}
