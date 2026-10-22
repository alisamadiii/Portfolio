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
            "flex items-start gap-3 rounded-xl border p-3.5 transition-colors",
            alert.severity === "critical"
              ? "border-destructive/25 bg-destructive/6 hover:bg-destructive/10"
              : "border-amber-500/30 bg-amber-500/8 hover:bg-amber-500/14"
          )}
        >
          <TriangleAlert
            className={cn(
              "mt-0.5 size-4.5 shrink-0",
              alert.severity === "critical"
                ? "text-destructive"
                : "text-amber-600 dark:text-amber-400"
            )}
          />
          <div>
            <p className="text-[14px] font-semibold">{alert.title}</p>
            <p className="text-muted-foreground text-[13px]">{alert.detail}</p>
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
