"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import { useAgency } from "@/components/agency/use-agency";
import { TriangleAlert } from "@/components/icon";

/** Account health checks, shown on top of the Marketing overview. */
export function AdsAlerts() {
  const trpc = useTRPC();
  const { repoId, adsConnected } = useAgency();
  const alerts = useQuery(
    trpc.agency.ads.alerts.queryOptions(
      { repoId },
      { enabled: adsConnected, staleTime: 5 * 60 * 1000, retry: false }
    )
  );

  if (!alerts.data?.length) return null;

  return (
    <div className="space-y-2">
      {alerts.data.map((alert) => (
        <Link
          key={alert.id}
          href={alert.href}
          className={cn(
            "flex items-start gap-3 rounded-[14px] p-4 transition-opacity hover:opacity-90",
            alert.severity === "critical"
              ? "bg-[#f8e6e7] text-[#a3283a]"
              : "bg-[#f6eedb] text-[#8a5a0a]"
          )}
        >
          <TriangleAlert className="mt-0.5 size-4.5 shrink-0" />
          <div>
            <p className="text-foreground text-[15px] font-semibold">
              {alert.title}
            </p>
            <p className="text-muted-foreground text-[14px]">{alert.detail}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

/** Count badge for the sidebar's Marketing item. */
export function AdsAlertCount() {
  const trpc = useTRPC();
  const { repoId, adsConnected } = useAgency();
  const alerts = useQuery(
    trpc.agency.ads.alerts.queryOptions(
      { repoId },
      { enabled: adsConnected, staleTime: 5 * 60 * 1000, retry: false }
    )
  );

  if (!alerts.data?.length) return null;
  return (
    <span className="bg-destructive/12 text-destructive grid size-5 place-items-center rounded-full text-[11px] font-bold">
      {alerts.data.length}
    </span>
  );
}
