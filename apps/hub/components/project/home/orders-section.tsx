"use client";

import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ReceiptText } from "lucide-react";

import { useTRPC } from "@workspace/trpc/client";

import { Badge } from "@/components/ds/ui/badge";
import { EmptyState, KpiGrid } from "@/components/ds/ui/misc";
import {
  DELIVERY_PROVIDERS,
  fromGrubhubOrder,
  fromUberOrder,
  orderKey,
  sortRows,
  type DeliveryAppId,
} from "@/components/orders/providers";
import { localTime, money } from "@/components/uber-eats/format";

import { SectionCard } from "./section-card";
import { fillDays, TrendChart } from "./trend-chart";
import type { RangeDays } from "./use-home-range";

const SERIES = [{ key: "orders", label: "Orders", color: "var(--chart-3)" }] as const;

const hot = (any: boolean | undefined) => (any ? 30_000 : 60_000);

/**
 * Delivery orders on Home, across every connected delivery app. Uber Eats and
 * Grubhub store orders; DoorDash is connection-only for now.
 */
export function OrdersSection({
  projectId,
  days,
  providers,
}: {
  projectId: string;
  days: RangeDays;
  providers: readonly DeliveryAppId[];
}) {
  const trpc = useTRPC();
  const uber = providers.includes("uber-eats");
  const grubhub = providers.includes("grubhub");
  const q = { retry: false, staleTime: 60_000 } as const;

  const uberStore = useQuery(trpc.uberEats.get.queryOptions({ projectId }, { ...q, enabled: uber }));
  const hasUber = Boolean(uberStore.data?.store);
  const uberSummary = useQuery(
    trpc.uberEats.summary.queryOptions({ projectId, days }, { ...q, enabled: hasUber, placeholderData: keepPreviousData })
  );
  const uberLatest = useQuery({
    ...trpc.uberEats.orders.queryOptions({ projectId, limit: 5 }),
    enabled: hasUber,
    retry: false,
    // Faster while something is cooking; Uber sends no webhook for accept / finish.
    refetchInterval: (s) => hot(s.state.data?.items.some((o) => o.state === "CREATED" || o.state === "ACCEPTED")),
  });

  const grubhubStore = useQuery(trpc.grubhub.get.queryOptions({ projectId }, { ...q, enabled: grubhub }));
  const hasGrubhub = Boolean(grubhubStore.data?.store);
  const grubhubSummary = useQuery(
    trpc.grubhub.summary.queryOptions({ projectId, days }, { ...q, enabled: hasGrubhub, placeholderData: keepPreviousData })
  );
  const grubhubLatest = useQuery({
    ...trpc.grubhub.orders.queryOptions({ projectId, limit: 5 }),
    enabled: hasGrubhub,
    retry: false,
    refetchInterval: (s) => hot(s.state.data?.items.some((o) => o.status === "RESTAURANT_CONFIRMABLE" || o.status === "CONFIRMED")),
  });

  const rows = sortRows([
    ...(uberLatest.data?.items ?? []).map((o) => fromUberOrder(o, uberStore.data?.store?.timezone ?? null)),
    ...(grubhubLatest.data?.items ?? []).map((o) => fromGrubhubOrder(o, grubhubStore.data?.store?.timezone ?? null)),
  ]).slice(0, 5);

  const u = hasUber ? uberSummary.data : null;
  const g = hasGrubhub ? grubhubSummary.data : null;
  const orders = (u?.orders ?? 0) + (g?.orders ?? 0);
  const salesCents = (u?.salesCents ?? 0) + (g?.salesCents ?? 0);
  const currency = u?.currency ?? g?.currency ?? null;
  const none = (!u && !g) || orders === 0;
  // Buckets are store-local days; merge both apps' days by date.
  const byDay = mergeDays([u?.byDay ?? [], g?.byDay ?? []]);
  const bounds = u || g ? { from: minDate(u?.from, g?.from), to: maxDate(u?.to, g?.to) } : days;
  const chart = fillDays(bounds, byDay, ["orders"]);

  const connectable = uber || grubhub;
  const loading = (uber && uberStore.isPending) || (grubhub && grubhubStore.isPending);
  const nothingConnected = connectable && !loading && !hasUber && !hasGrubhub;
  const onlyOthers = !connectable && providers.length > 0;

  return (
    <SectionCard
      title="Orders"
      icon={<ReceiptText className="size-4" strokeWidth={1.8} />}
      href="/orders"
      linkLabel="All orders"
      loading={loading}
      stale={uberSummary.isPlaceholderData || grubhubSummary.isPlaceholderData}
      className="xl:col-span-2"
    >
      {onlyOthers || nothingConnected ? (
        <EmptyState
          icon={<ReceiptText className="size-5" />}
          title={onlyOthers ? "DoorDash orders arrive in a later update" : `Connect your ${uber && grubhub ? "delivery" : uber ? "Uber Eats" : "Grubhub"} store`}
          text={
            onlyOthers
              ? "Your DoorDash connection is in place. Orders come to Client Hub once DoorDash turns on order sharing."
              : "Once the store is connected, every order lands here within a minute."
          }
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            <KpiGrid
              bare
              dim={none}
              items={[
                { label: "Orders", value: none ? "—" : String(orders) },
                { label: "Sales", value: none ? "—" : money(salesCents, currency), sub: hasGrubhub ? "Grubhub: before commission" : undefined },
                { label: "Average order", value: none ? "—" : money(Math.round(salesCents / orders), currency) },
                {
                  label: "Est. payout",
                  value: none || !u || u.estPayoutCents == null ? "—" : money(u.estPayoutCents, u.currency),
                  sub: !hasUber ? "Grubhub payouts are in Grubhub for Restaurants" : u && u.commissionBps == null ? "Add your commission rate" : hasGrubhub ? "Uber Eats only" : undefined,
                },
              ]}
            />
            {none ? (
              <div className="flex h-[200px] items-center justify-center rounded-inner border border-dashed border-line text-[13px] text-faint">
                Chart appears once orders come in.
              </div>
            ) : (
              <TrendChart data={chart} series={SERIES} />
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-[13px] font-medium text-dim">Latest orders</span>
            {rows.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-faint">No orders yet.</p>
            ) : (
              <ul className="flex flex-col">
                {rows.map((o, i) => {
                  const { Logo, name } = DELIVERY_PROVIDERS[o.provider];
                  return (
                    <li key={orderKey(o.provider, o.id)} className={i > 0 ? "border-t border-divider" : ""}>
                      <Link
                        href={`/orders?order=${encodeURIComponent(orderKey(o.provider, o.id))}`}
                        className="flex items-center gap-3 rounded-inner py-2.5 text-[13px] hover:bg-hover"
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-[6px] border border-line bg-surface" title={name}>
                          <Logo className="size-4" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-medium text-ink">
                            #{o.displayId} · {o.customer}
                          </span>
                          <span className="truncate text-dim">
                            {format(parseISO(o.placedAt), "MMM d")}, {localTime(o.placedAt, o.timezone)} · {o.typeLabel}
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums text-ink">{money(o.totalCents, o.currency)}</span>
                        <Badge tone={o.tone}>{o.stateLabel}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

type DayBucket = { date: string; orders: number; salesCents: number };

/** Sums each app's per-day buckets by date (both are store-local "YYYY-MM-DD"). */
export function mergeDays(lists: DayBucket[][]): DayBucket[] {
  const byDate = new Map<string, DayBucket>();
  for (const list of lists) {
    for (const d of list) {
      const hit = byDate.get(d.date);
      if (hit) {
        hit.orders += d.orders;
        hit.salesCents += d.salesCents;
      } else byDate.set(d.date, { ...d });
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

const minDate = (a: string | undefined, b: string | undefined) => (a && b ? (a < b ? a : b) : (a ?? b ?? ""));
const maxDate = (a: string | undefined, b: string | undefined) => (a && b ? (a > b ? a : b) : (a ?? b ?? ""));
