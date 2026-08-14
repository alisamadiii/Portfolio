import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";

import { HubContainer } from "@/components/hub-container";
import { HubSidebar } from "@/components/hub-sidebar";

export default function HubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "18.5rem" } as React.CSSProperties}
    >
      <HubSidebar />
      <SidebarInset className="bg-shell min-h-screen">
        <header className="bg-shell sticky top-0 z-30 flex h-12 shrink-0 items-center px-4 md:hidden">
          <SidebarTrigger />
        </header>
        <main className="w-full flex-1">
          <HubContainer>{children}</HubContainer>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
