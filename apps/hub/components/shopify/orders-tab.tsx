"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ShoppingBag } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { Badge } from "@/components/ds/ui/badge";
import { Button } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { Input } from "@/components/ds/ui/field";
import { EmptyState, KpiGrid } from "@/components/ds/ui/misc";
import { SegmentedTabs } from "@/components/ds/ui/tabs";
import { RangeMenu } from "@/components/project/home/range-menu";
import { useHomeRange } from "@/components/project/home/use-home-range";
import { itemsSummary, localTime, money } from "@/components/uber-eats/format";
import { useProjectId } from "@/hooks/use-repo";
import { handleCmsError } from "@/lib/trpc-errors";

import { orderBadge } from "./format";
import { OrderDialog } from "./order-dialog";

type Store = NonNullable<RouterOutputs["shopify"]["get"]["store"]>;
type Order = RouterOutputs["shopify"]["orders"]["items"][number];

const STATUSES = ["all", "open", "completed", "canceled"] as const;
type StatusFilter = (typeof STATUSES)[number];
const STATUS_LABELS: Record<StatusFilter, string> = { all: "All", open: "To ship", completed: "Shipped", canceled: "Canceled" };

export function OrdersTab({ store, fullAccess }: { store: Store; fullAccess: boolean }) {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const { range, setRange, days } = useHomeRange();
  const [status, setStatus] = useQueryState("status", parseAsStringLiteral(STATUSES).withDefault("all"));
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [cursors, setCursors] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const cursor = cursors.at(-1);
  const tz = store.timezone;

  const summary = useQuery(
    trpc.shopify.summary.queryOptions({ projectId, days }, { retry: false, placeholderData: keepPreviousData })
  );
  const list = useQuery({
    ...trpc.shopify.orders.queryOptions({
      projectId,
      cursor,
      days,
      status: status === "all" ? undefined : status,
      search: query || undefined,
    }),
    retry: false,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const s = summary.data;
  const none = !s || s.orders === 0;
  const columns: Column<Order>[] = [
    {
      key: "order",
      header: "Order",
      width: "minmax(110px, 0.7fr)",
      cell: (o) => <span className="font-medium text-ink">{o.name}</span>,
    },
    {
      key: "placed",
      header: "Placed",
      width: "minmax(140px, 1fr)",
      cell: (o) => (
        <span className="text-ink">
          {format(parseISO(o.placedAt), "MMM d")}, {localTime(o.placedAt, tz)}
        </span>
      ),
    },
    { key: "items", header: "Items", width: "minmax(200px, 2fr)", cell: (o) => <span className="line-clamp-2 text-ink">{itemsSummary(o.items)}</span> },
    { key: "total", header: "Total", width: "110px", align: "end", cell: (o) => <span className="font-medium text-ink">{money(o.totalCents, o.currency)}</span> },
    {
      key: "status",
      header: "Status",
      width: "140px",
      align: "end",
      cell: (o) => {
        const b = orderBadge(o);
        return <Badge tone={b.tone}>{b.label}</Badge>;
      },
    },
  ];

  const reset = () => setCursors([]);

  return (
    <>
      <div className="flex justify-end">
        <RangeMenu
          range={range}
          onChange={(r) => {
            reset();
            setRange(r);
          }}
        />
      </div>
      {summary.isPending ? (
        <Skeleton className="h-[88px] rounded-card" />
      ) : (
        <KpiGrid
          dim={none}
          items={[
            { label: "Orders", value: none ? "—" : String(s.orders), sub: s?.capped ? "Newest 2,000 only" : undefined },
            { label: "Sales", value: none ? "—" : money(s.salesCents, s.currency), sub: none ? undefined : "After refunds, cancellations left out" },
            { label: "Average order", value: none || s.avgOrderCents == null ? "—" : money(s.avgOrderCents, s.currency) },
          ]}
        />
      )}
      <Card className={cn(list.isPlaceholderData && "opacity-60")}>
        <div className="flex flex-wrap items-center gap-3 border-b border-divider px-4 py-3">
          <SegmentedTabs
            label="Filter by status"
            value={status}
            onChange={(id) => {
              reset();
              void setStatus(id as StatusFilter);
            }}
            items={STATUSES.map((v) => ({ id: v, label: STATUS_LABELS[v] }))}
          />
          <form
            className="ml-auto w-full sm:w-[240px]"
            onSubmit={(e) => {
              e.preventDefault();
              reset();
              setQuery(search.trim());
            }}
          >
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders, e.g. 1024" aria-label="Search orders" />
          </form>
        </div>
        {list.isPending ? (
          <div className="p-6">
            <Skeleton className="h-[180px] rounded-card" />
          </div>
        ) : list.isError ? (
          <EmptyState icon={<ShoppingBag className="size-5" />} title="Couldn't load orders" text={handleCmsError(list.error, "Try again in a moment.")} />
        ) : (
          <DataTable
            columns={columns}
            rows={list.data.items}
            rowKey={(o) => o.id}
            minWidth={680}
            onRowClick={(o) => setOpenId(o.id)}
            empty={
              <EmptyState
                icon={<ShoppingBag className="size-5" />}
                title={query ? "No orders match" : "No orders in this period"}
                text={query ? "Try another order number or word." : "Try a longer range or another status."}
              />
            }
          />
        )}
        {(cursors.length > 0 || list.data?.nextCursor) && (
          <div className="flex justify-end gap-2 border-t border-divider px-6 py-3">
            <Button size="sm" disabled={cursors.length === 0} onClick={() => setCursors((c) => c.slice(0, -1))}>
              Newer
            </Button>
            <Button
              size="sm"
              disabled={!list.data?.nextCursor}
              onClick={() => list.data?.nextCursor && setCursors((c) => [...c, list.data!.nextCursor!])}
            >
              Older
            </Button>
          </div>
        )}
      </Card>
      <OrderDialog orderId={openId} timezone={tz} fullAccess={fullAccess} onClose={() => setOpenId(null)} />
    </>
  );
}
