"use client";

import { usePathname } from "next/navigation";

import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";

import { CommandMenu } from "@/components/command-menu";
import {
  AdminSidebar,
  type AdminUser,
} from "@/components/shell/admin-sidebar";
import { AdminHeader } from "@/components/shell/admin-header";

export const AdminShell = ({
  user,
  defaultSidebarOpen,
  children,
}: {
  user: AdminUser;
  defaultSidebarOpen: boolean;
  children: React.ReactNode;
}) => {
  const pathname = usePathname();

  // The code editor renders its own full-screen chrome
  if (pathname.startsWith("/code/")) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <AdminSidebar />
      <SidebarInset>
        <AdminHeader user={user} />
        <div className="flex-1 px-6 pt-2 pb-6">{children}</div>
      </SidebarInset>
      <CommandMenu />
    </SidebarProvider>
  );
};
