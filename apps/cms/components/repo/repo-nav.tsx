"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConfig } from "@/contexts/config-context";
import { useUser } from "@/contexts/user-context";
import { FileStack, FileText, FolderOpen, Settings, Users } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

import { isAdminUser } from "@/lib/authz-shared";
import { isConfigEnabled } from "@/lib/config";

const RepoNavItem = ({
  children,
  href,
  icon,
  active,
  onClick,
}: {
  children: React.ReactNode;
  href: string;
  icon: React.ReactNode;
  active: boolean;
  onClick?: () => void;
}) => (
  <Link
    className={cn(
      active ? "bg-accent" : "hover:bg-accent",
      "focus:bg-accent flex items-center rounded-lg px-3 py-2 font-medium outline-none"
    )}
    href={href}
    onClick={onClick}
  >
    {icon}
    <span className="truncate">{children}</span>
  </Link>
);

const RepoNav = ({ onClick }: { onClick?: () => void }) => {
  const { config } = useConfig();
  const { user } = useUser();
  const pathname = usePathname();

  const items = useMemo(() => {
    if (!config || !config.object) return [];
    const configObject: any = config.object;
    const contentItems =
      configObject.content?.map((item: any) => ({
        key: item.name,
        icon:
          item.type === "collection" ? (
            <FileStack className="mr-2 h-5 w-5" />
          ) : (
            <FileText className="mr-2 h-5 w-5" />
          ),
        href: `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/${item.type}/${encodeURIComponent(item.name)}`,
        label: item.label || item.name,
      })) || [];

    const mediaItems =
      configObject.media?.map((item: any) => ({
        key: item.name || "media",
        icon: <FolderOpen className="mr-2 h-5 w-5" />,
        href: `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/media/${item.name}`,
        label: item.label || item.name || "Media",
      })) || [];

    const canManageRepo = isAdminUser(user);

    const settingsItem =
      canManageRepo && isConfigEnabled(configObject)
        ? {
            key: "configuration",
            icon: <Settings className="mr-2 h-5 w-5" />,
            href: `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/configuration`,
            label: "Configuration",
          }
        : null;

    const collaboratorsItem =
      configObject && Object.keys(configObject).length !== 0 && canManageRepo
        ? {
            key: "collaborators",
            icon: <Users className="mr-2 h-5 w-5" />,
            href: `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collaborators`,
            label: "Collaborators",
          }
        : null;

    return [
      ...contentItems,
      ...mediaItems,
      settingsItem,
      collaboratorsItem,
    ].filter(Boolean);
  }, [config, user]);

  if (!items.length) return null;

  return (
    <>
      {items.map((item) => (
        <RepoNavItem
          key={item.key}
          icon={item.icon}
          href={item.href}
          active={
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          }
          onClick={onClick}
        >
          {item.label}
        </RepoNavItem>
      ))}
    </>
  );
};

export { RepoNav };
