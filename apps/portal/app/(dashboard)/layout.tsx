import {
  SidebarProvider,
} from "@workspace/ui/components/sidebar";

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
      <SidebarProvider>
        <AppSidebar />
        <main className="w-full flex-1">
          <PortalHeader />
          <div className="mx-auto max-w-5xl p-4 py-12">{children}</div>
        </main>
      </SidebarProvider>
    </ProtectRoute>
  );
}
