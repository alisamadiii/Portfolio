"use client";

import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ReceiptText } from "lucide-react";

import { useTRPC } from "@workspace/trpc/client";

import { Badge } from "@/components/ds/ui/badge";
import { EmptyState, KpiGrid } from "@/components/ds/ui/misc";
import { DELIVERY_PROVIDERS, fromUberOrder, type DeliveryAppId } from "@/components/orders/providers";
import { localTime, money } from "@/components/uber-eats/format";

import { SectionCard } from "./section-card";
import { fillDays, TrendChart } from "./trend-chart";
import type { RangeDays } from "./use-home-range";

const SERIES = [{ key: "orders", label: "Orders", color: "var(--chart-3)" }] as const;

/**
 * Delivery orders on Home, across every connected delivery app. Uber Eats is
 * the only provider that stores orders today; DoorDash is connection-only.
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
  const store = useQuery(trpc.uberEats.get.queryOptions({ projectId }, { enabled: uber, retry: false, staleTime: 60_000 }));
  const hasStore = Boolean(store.data?.store);
  const summary = useQuery(
    trpc.uberEats.summary.queryOptions(
      { projectId, days },
      { enabled: hasStore, retry: false, placeholderData: keepPreviousData, staleTime: 60_000 }
    )
  );
  const latest = useQuery({
    ...trpc.uberEats.orders.queryOptions({ projectId, limit: 5 }),
    enabled: hasStore,
    retry: false,
    // Faster while something is cooking; Uber sends no webhook for accept / finish.
    refetchInterval: (q) =>
      q.state.data?.items.some((o) => o.state === "CREATED" || o.state === "ACCEPTED") ? 30_000 : 60_000,
  });
  const timezone = store.data?.store?.timezone ?? null;
  const rows = (latest.data?.items ?? []).map((o) => fromUberOrder(o, timezone));
  const s = summary.data;
  const none = !s || s.orders === 0;
  // Buckets are store-local days, so fill from the store's own calendar bounds.
  const chart = fillDays(s ? { from: s.from, to: s.to } : days, s?.byDay ?? [], ["orders"]);
  const onlyOthers = !uber && providers.length > 0;

  return (
    <SectionCard
      title="Orders"
      icon={<ReceiptText className="size-4" strokeWidth={1.8} />}
      href="/orders"
      linkLabel="All orders"
      loading={uber && store.isPending}
      stale={summary.isPlaceholderData}
      className="xl:col-span-2"
    >
      {onlyOthers || (uber && store.data && !hasStore) ? (
        <EmptyState
          icon={<ReceiptText className="size-5" />}
          title={onlyOthers ? "DoorDash orders arrive in a later update" : "Connect your Uber Eats store"}
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
                { label: "Orders", value: none ? "—" : String(s.orders) },
                { label: "Sales", value: none ? "—" : money(s.salesCents, s.currency) },
                { label: "Average order", value: none ? "—" : money(s.avgOrderCents, s.currency) },
                {
                  label: "Est. payout",
                  value: none || s.estPayoutCents == null ? "—" : money(s.estPayoutCents, s.currency),
                  sub: s && s.commissionBps == null ? "Add your commission rate" : undefined,
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
                    <li key={o.id} className={i > 0 ? "border-t border-divider" : ""}>
                      <Link
                        href={`/orders?order=${encodeURIComponent(o.id)}`}
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
