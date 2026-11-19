"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Check, ReceiptText } from "lucide-react";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { PageHeader } from "@/components/ds/layout/page-header";
import { Badge } from "@/components/ds/ui/badge";
import { Button, ButtonLink } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { EmptyState, KpiGrid } from "@/components/ds/ui/misc";
import { SegmentedTabs } from "@/components/ds/ui/tabs";
import { RangeMenu } from "@/components/project/home/range-menu";
import { useHomeRange } from "@/components/project/home/use-home-range";
import { localTime, money } from "@/components/uber-eats/format";
import { OrderDialog } from "@/components/uber-eats/order-dialog";
import { useInstalledApps } from "@/hooks/use-installed-apps";
import { useProject } from "@/hooks/use-project";
import { useProjectId } from "@/hooks/use-repo";
import { handleCmsError } from "@/lib/trpc-errors";

import {
  DELIVERY_PROVIDERS,
  fromUberOrder,
  installedDeliveryApps,
  type DeliveryAppId,
  type DeliveryOrderRow,
} from "./providers";

const STATUSES = ["all", "open", "completed", "canceled"] as const;
type StatusFilter = (typeof STATUSES)[number];
const STATUS_LABELS: Record<StatusFilter, string> = { all: "All", open: "Open", completed: "Completed", canceled: "Canceled" };

/** Every delivery order from every connected app, newest first, with the full detail dialog on click. */
export function OrdersPage() {
  const projectId = useProjectId();
  const { installed, isLoaded } = useInstalledApps(projectId);
  const providers = installedDeliveryApps(installed);
  const { range, setRange, days } = useHomeRange();
  const [provider, setProvider] = useQueryState("provider", parseAsStringLiteral(["all", ...providers] as const).withDefault("all"));
  const [status, setStatus] = useQueryState("status", parseAsStringLiteral(STATUSES).withDefault("all"));
  const [openId, setOpenId] = useQueryState("order", parseAsString);

  if (isLoaded && providers.length === 0) {
    return (
      <>
        <PageHeader title="Orders" description="Every delivery order from your connected apps, in one list." docs="client-hub/orders" />
        <Card>
          <EmptyState
            icon={<ReceiptText className="size-5" />}
            title="No delivery app yet"
            text="Add Uber Eats or DoorDash and their orders show up here, with every detail and a printable receipt."
            action={<ButtonLink variant="primary" size="sm" href="/apps">Browse apps</ButtonLink>}
          />
        </Card>
      </>
    );
  }

  const showUber = providers.includes("uber-eats") && (provider === "all" || provider === "uber-eats");
  const selected = provider !== "all" ? (provider as DeliveryAppId) : null;

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every delivery order from your connected apps, in one list."
        docs="client-hub/orders"
        actions={<RangeMenu range={range} onChange={setRange} />}
      />
      {showUber ? (
        <UberOrders
          projectId={projectId}
          days={days}
          status={status}
          openId={openId}
          setOpenId={(id) => void setOpenId(id)}
          toolbar={
            <Toolbar
              providers={providers}
              provider={provider}
              setProvider={(p) => void setProvider(p)}
              status={status}
              setStatus={(s) => void setStatus(s)}
            />
          }
        />
      ) : (
        <>
          <KpiGrid dim items={[{ label: "Orders", value: "—" }, { label: "Sales", value: "—" }, { label: "Average order", value: "—" }, { label: "Est. payout", value: "—" }]} />
          <Card>
            <Toolbar
              providers={providers}
              provider={provider}
              setProvider={(p) => void setProvider(p)}
              status={status}
              setStatus={(s) => void setStatus(s)}
            />
            <EmptyState
              icon={<ReceiptText className="size-5" />}
              title={selected ? `${DELIVERY_PROVIDERS[selected].name} orders arrive in a later update` : "No orders yet"}
              text={
                selected
                  ? "The connection is in place. Orders come to Client Hub once the marketplace turns on order sharing."
                  : "Orders show up here once a connected app starts sending them."
              }
            />
          </Card>
        </>
      )}
    </>
  );
}

function Toolbar({
  providers,
  provider,
  setProvider,
  status,
  setStatus,
}: {
  providers: readonly DeliveryAppId[];
  provider: string;
  setProvider: (p: "all" | DeliveryAppId) => void;
  status: StatusFilter;
  setStatus: (s: StatusFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-divider px-4 py-3">
      {providers.length > 1 && (
        <SegmentedTabs
          label="Filter by app"
          value={provider}
          onChange={(id) => setProvider(id as "all" | DeliveryAppId)}
          items={[{ id: "all", label: "All apps" }, ...providers.map((p) => ({ id: p, label: DELIVERY_PROVIDERS[p].name }))]}
        />
      )}
      <SegmentedTabs
        label="Filter by status"
        value={status}
        onChange={(id) => setStatus(id as StatusFilter)}
        items={STATUSES.map((s) => ({ id: s, label: STATUS_LABELS[s] }))}
      />
    </div>
  );
}

function UberOrders({
  projectId,
  days,
  status,
  openId,
  setOpenId,
  toolbar,
}: {
  projectId: string;
  days: 7 | 28 | 90;
  status: StatusFilter;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  toolbar: React.ReactNode;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const role = useProject()?.role;
  const store = useQuery(trpc.uberEats.get.queryOptions({ projectId }, { retry: false }));
  const timezone = store.data?.store?.timezone ?? null;
  const canAccept = Boolean(store.data?.store?.isOrderManager) && (role === "full-access" || role === "content-editor");
  const summary = useQuery(
    trpc.uberEats.summary.queryOptions({ projectId, days }, { retry: false, placeholderData: keepPreviousData })
  );
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors.at(-1);
  const list = useQuery({
    ...trpc.uberEats.orders.queryOptions({
      projectId,
      cursor,
      days,
      status: status === "all" ? undefined : status,
    }),
    retry: false,
    placeholderData: keepPreviousData,
    refetchInterval: (q) =>
      q.state.data?.items.some((o) => o.state === "CREATED" || o.state === "ACCEPTED") ? 30_000 : 60_000,
  });
  const accept = useMutation(
    trpc.uberEats.acceptOrder.mutationOptions({
      onSuccess: () => {
        toast.success("Order accepted.");
        void queryClient.invalidateQueries({ queryKey: trpc.uberEats.pathKey() });
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't accept the order.")),
    })
  );
  const rows = (list.data?.items ?? []).map((o) => fromUberOrder(o, timezone));
  const s = summary.data;
  const none = !s || s.orders === 0;

  const columns: Column<DeliveryOrderRow>[] = [
    {
      key: "provider",
      header: "App",
      width: "72px",
      cell: (o) => {
        const { Logo, name } = DELIVERY_PROVIDERS[o.provider];
        return (
          <span className="flex size-8 items-center justify-center rounded-[6px] border border-line bg-surface" title={name} aria-label={name}>
            <Logo className="size-4" />
          </span>
        );
      },
    },
    {
      key: "order",
      header: "Order",
      width: "minmax(130px, 0.8fr)",
      cell: (o) => (
        <div className="flex flex-col gap-0.5 py-3">
          <span className="font-medium text-ink">#{o.displayId}</span>
          <span className="text-[13px] text-dim">{o.customer}</span>
        </div>
      ),
    },
    {
      key: "placed",
      header: "Placed",
      width: "minmax(150px, 1fr)",
      cell: (o) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-ink">{format(parseISO(o.placedAt), "MMM d")}, {localTime(o.placedAt, o.timezone)}</span>
          <span className="text-[13px] text-dim">{o.typeLabel}</span>
        </div>
      ),
    },
    { key: "items", header: "Items", width: "minmax(200px, 2fr)", cell: (o) => <span className="line-clamp-2 text-ink">{o.itemsSummary}</span> },
    { key: "total", header: "Total", width: "100px", align: "end", cell: (o) => <span className="font-medium text-ink">{money(o.totalCents, o.currency)}</span> },
    {
      key: "status",
      header: "Status",
      width: canAccept ? "170px" : "120px",
      align: "end",
      cell: (o) =>
        canAccept && o.awaitingAccept ? (
          <Button
            size="sm"
            variant="primary"
            icon={<Check className="size-4" />}
            disabled={accept.isPending}
            onClick={(e) => {
              e.stopPropagation();
              accept.mutate({ projectId, id: o.id });
            }}
          >
            Accept
          </Button>
        ) : (
          <Badge tone={o.tone}>{o.stateLabel}</Badge>
        ),
    },
  ];

  return (
    <>
      {summary.isPending ? (
        <Skeleton className="h-[88px] rounded-card" />
      ) : (
        <KpiGrid
          dim={none}
          items={[
            { label: "Orders", value: none ? "—" : String(s.orders) },
            { label: "Sales", value: none ? "—" : money(s.salesCents, s.currency) },
            { label: "Average order", value: none ? "—" : money(s.avgOrderCents, s.currency) },
            {
              label: "Est. payout",
              value: none || s.estPayoutCents == null ? "—" : money(s.estPayoutCents, s.currency),
              sub: s && s.commissionBps == null ? "Add your commission rate in Uber Eats" : undefined,
            },
          ]}
        />
      )}
      <Card className={cn(list.isPlaceholderData && "opacity-60")}>
        {toolbar}
        {list.isPending ? (
          <div className="p-6">
            <Skeleton className="h-[180px] rounded-card" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(o) => `${o.provider}:${o.id}`}
            minWidth={760}
            onRowClick={(o) => setOpenId(o.id)}
            empty={
              <EmptyState
                icon={<ReceiptText className="size-5" />}
                title="No orders in this period"
                text="Try a longer range or another status."
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
      <OrderDialog orderId={openId} timezone={timezone} canAccept={canAccept} onClose={() => setOpenId(null)} />
    </>
  );
}
