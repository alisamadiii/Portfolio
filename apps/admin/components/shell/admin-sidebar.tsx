"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  Code2,
  ExternalLink,
  Gauge,
  ImageIcon,
  Package,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar";

export type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

const groups = [
  {
    label: "Platform",
    items: [
      { label: "Overview", href: "/", icon: Gauge },
      { label: "Users", href: "/users", icon: Users },
      { label: "Products", href: "/products", icon: Package },
      { label: "Media", href: "/media", icon: ImageIcon },
    ],
  },
  {
    label: "Content",
    items: [{ label: "Code", href: "/code", icon: Code2 }],
  },
];

export const AdminSidebar = () => {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="group-data-[collapsible=icon]:justify-center"
              render={<Link href="/" />}
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 text-sm font-bold text-white">
                A
              </div>
              <span className="text-base font-semibold tracking-tight">
                Admin
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive(item.href)}
                      tooltip={item.label}
                      className="rounded-lg data-[active=true]:font-medium"
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarGroup>
          <SidebarGroupLabel>External</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Subscriptions"
                  className="rounded-lg"
                  render={
                    <a
                      href={`${process.env.NEXT_PUBLIC_POLAR_URL}/sales/subscriptions`}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                >
                  <ExternalLink />
                  <span>Subscriptions</span>
                  <ArrowUpRight className="ml-auto size-3.5 opacity-50" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
};
