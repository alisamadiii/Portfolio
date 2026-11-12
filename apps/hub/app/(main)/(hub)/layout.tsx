import { AccountSidebar } from "@/components/ds/layout/account-sidebar";
import { AppShell } from "@/components/ds/layout/app-shell";
import { TopBar } from "@/components/ds/layout/top-bar";

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell topBar={<TopBar />} sidebar={<AccountSidebar />}>
      {children}
    </AppShell>
  );
}
