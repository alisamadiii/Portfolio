import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";

import { AgencyMain } from "@/components/agency/agency-main";
import { CampaignFilterProvider } from "@/components/agency/campaign-filter";
import { AgencySidebar } from "@/components/agency/sidebar";

export default function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "18.5rem" } as React.CSSProperties}
    >
      <CampaignFilterProvider>
        <AgencySidebar />
        <SidebarInset className="bg-shell min-h-screen">
          <header className="bg-shell sticky top-0 z-30 flex h-12 shrink-0 items-center px-4 md:hidden">
            <SidebarTrigger />
          </header>
          <main className="w-full flex-1">
            <AgencyMain>{children}</AgencyMain>
          </main>
        </SidebarInset>
      </CampaignFilterProvider>
    </SidebarProvider>
  );
}
