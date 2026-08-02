import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";

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
          <div className="max-w-[860px] p-6 md:p-10">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
