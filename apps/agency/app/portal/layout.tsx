import {
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";

import { AppSidebar } from "@/components/app-sidebar";
import { PortalHeader } from "@/components/portal/header";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full flex-1">
        <PortalHeader />
        <div className="mx-auto max-w-7xl p-4 py-12">{children}</div>
      </main>
    </SidebarProvider>
  );
}
