"use client";

import type { ReactNode } from "react";

import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { Card, TextLink } from "@/components/ds/ui/card";
import { IconTile } from "@/components/ds/ui/misc";

/**
 * One dashboard section: an app's icon + name, a link to the app, then its
 * numbers. `loading` shows a skeleton in place of the body; `stale` dims the
 * body while a new range is loading on top of the previous data.
 */
export function SectionCard({
  title,
  icon,
  brand = false,
  href,
  linkLabel,
  loading = false,
  stale = false,
  className,
  children,
}: {
  title: string;
  icon: ReactNode;
  /** The icon is a brand logo (no coral fill). */
  brand?: boolean;
  href: string;
  linkLabel: string;
  loading?: boolean;
  stale?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn("flex min-w-0 flex-col", className)}>
      <div className="flex items-center justify-between gap-3 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <IconTile size={32} tone={brand ? "brand" : "coral"}>
            {icon}
          </IconTile>
          <h2 className="text-base font-semibold tracking-[-0.01em]">{title}</h2>
        </div>
        <TextLink href={href}>{linkLabel}</TextLink>
      </div>
      <div className={cn("flex min-w-0 flex-1 flex-col gap-4 px-6 pb-6 transition-opacity", stale && "opacity-60")}>
        {loading ? <Skeleton className="h-[220px] w-full rounded-inner" /> : children}
      </div>
    </Card>
  );
}
