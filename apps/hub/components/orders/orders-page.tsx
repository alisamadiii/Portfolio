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
import { OrderDialog as GrubhubOrderDialog } from "@/components/grubhub/order-dialog";
import { RangeMenu } from "@/components/project/home/range-menu";
import { useHomeRange } from "@/components/project/home/use-home-range";
import { localTime, money } from "@/components/uber-eats/format";
import { OrderDialog as UberOrderDialog } from "@/components/uber-eats/order-dialog";
import { useInstalledApps } from "@/hooks/use-installed-apps";
import { useProject } from "@/hooks/use-project";
import { useProjectId } from "@/hooks/use-repo";
import { handleCmsError } from "@/lib/trpc-errors";

import {
  DELIVERY_PROVIDERS,
  fromGrubhubOrder,
  fromUberOrder,
  installedDeliveryApps,
  orderKey,
  orderProviders,
  parseOrderKey,
  sortRows,
  type DeliveryAppId,
  type DeliveryOrderRow,
} from "./providers";

const STATUSES = ["all", "open", "completed", "canceled"] as const;
type StatusFilter = (typeof STATUSES)[number];
const STATUS_LABELS: Record<StatusFilter, string> = { all: "All", open: "Open", completed: "Completed", canceled: "Canceled" };
type Days = 7 | 28 | 90;

/** Every delivery order from every connected app, newest first, with each app's own detail dialog on click. */
export function OrdersPage() {
  const projectId = useProjectId();
  const { installed, isLoaded } = useInstalledApps(projectId);
  const providers = installedDeliveryApps(installed);
  const withOrders = orderProviders(installed);
  const { range, setRange, days } = useHomeRange();
  const [provider, setProvider] = useQueryState("provider", parseAsStringLiteral(["all", ...providers] as const).withDefault("all"));
  const [status, setStatus] = useQueryState("status", parseAsStringLiteral(STATUSES).withDefault("all"));
  const [openKey, setOpenKey] = useQueryState("order", parseAsString);

  if (isLoaded && providers.length === 0) {
    return (
      <>
        <PageHeader title="Orders" description="Every delivery order from your connected apps, in one list." docs="client-hub/orders" />
        <Card>
          <EmptyState
            icon={<ReceiptText className="size-5" />}
            title="No delivery app yet"
            text="Add Uber Eats, DoorDash or Grubhub and their orders show up here, with every detail and a printable receipt."
            action={<ButtonLink variant="primary" size="sm" href="/apps">Browse apps</ButtonLink>}
          />
        </Card>
      </>
    );
  }

  const selected = provider !== "all" ? (provider as DeliveryAppId) : null;
  const active = withOrders.filter((p) => !selected || p === selected);
  const toolbar = (
    <Toolbar
      providers={providers}
      provider={provider}
      setProvider={(p) => void setProvider(p)}
      status={status}
      setStatus={(s) => void setStatus(s)}
    />
  );

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every delivery order from your connected apps, in one list."
        docs="client-hub/orders"
        actions={<RangeMenu range={range} onChange={setRange} />}
      />
      {active.length > 0 ? (
        <Feed
          projectId={projectId}
          providers={active}
          days={days}
          status={status}
          openKey={openKey}
          setOpenKey={(k) => void setOpenKey(k)}
          toolbar={toolbar}
        />
      ) : (
        <>
          <KpiGrid dim items={[{ label: "Orders", value: "—" }, { label: "Sales", value: "—" }, { label: "Average order", value: "—" }, { label: "Est. payout", value: "—" }]} />
          <Card>
            {toolbar}
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

type FeedArgs = { projectId: string; enabled: boolean; days: Days; status: StatusFilter; cursor: string | undefined };

/** One provider's slice of the page: store, summary, a page of rows, and the inline action. */
type ProviderFeed = {
  rows: DeliveryOrderRow[];
  nextCursor: string | null;
  isPending: boolean;
  isPlaceholder: boolean;
  summary: { orders: number; salesCents: number; estPayoutCents: number | null; commissionBps: number | null; currency: string | null } | null;
  summaryPending: boolean;
  timezone: string | null;
  canAct: boolean;
  act: (id: string) => void;
  acting: boolean;
};

const hot = (rows: { awaitingAccept: boolean; status: string }[] | undefined) =>
  rows?.some((o) => o.awaitingAccept || o.status === "open") ? 30_000 : 60_000;

function useUberFeed({ projectId, enabled, days, status, cursor }: FeedArgs): ProviderFeed {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const role = useProject()?.role;
  const store = useQuery(trpc.uberEats.get.queryOptions({ projectId }, { enabled, retry: false }));
  const timezone = store.data?.store?.timezone ?? null;
  const canAct = Boolean(store.data?.store?.isOrderManager) && (role === "full-access" || role === "content-editor");
  const summary = useQuery(
    trpc.uberEats.summary.queryOptions({ projectId, days }, { enabled, retry: false, placeholderData: keepPreviousData })
  );
  const list = useQuery({
    ...trpc.uberEats.orders.queryOptions({ projectId, cursor, days, status: status === "all" ? undefined : status }),
    enabled,
    retry: false,
    placeholderData: keepPreviousData,
    refetchInterval: (q) => hot(q.state.data?.items.map((o) => ({ awaitingAccept: o.state === "CREATED", status: o.state === "ACCEPTED" ? "open" : "" }))),
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
  return {
    rows: (list.data?.items ?? []).map((o) => fromUberOrder(o, timezone)),
    nextCursor: list.data?.nextCursor ?? null,
    isPending: enabled && list.isPending,
    isPlaceholder: list.isPlaceholderData,
    summary: summary.data ?? null,
    summaryPending: enabled && summary.isPending,
    timezone,
    canAct,
    act: (id) => accept.mutate({ projectId, id }),
    acting: accept.isPending,
  };
}

function useGrubhubFeed({ projectId, enabled, days, status, cursor }: FeedArgs): ProviderFeed {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const role = useProject()?.role;
  const store = useQuery(trpc.grubhub.get.queryOptions({ projectId }, { enabled, retry: false }));
  const timezone = store.data?.store?.timezone ?? null;
  const canAct = store.data?.store?.integrationStatus === "LIVE" && (role === "full-access" || role === "content-editor");
  const summary = useQuery(
    trpc.grubhub.summary.queryOptions({ projectId, days }, { enabled, retry: false, placeholderData: keepPreviousData })
  );
  const list = useQuery({
    ...trpc.grubhub.orders.queryOptions({ projectId, cursor, days, status: status === "all" ? undefined : status }),
    enabled,
    retry: false,
    placeholderData: keepPreviousData,
    refetchInterval: (q) =>
      hot(q.state.data?.items.map((o) => ({ awaitingAccept: o.status === "RESTAURANT_CONFIRMABLE", status: o.status === "CONFIRMED" || o.status === "PICKUP_READY" ? "open" : "" }))),
  });
  const confirm = useMutation(
    trpc.grubhub.confirmOrder.mutationOptions({
      onSuccess: () => {
        toast.success("Order confirmed.");
        void queryClient.invalidateQueries({ queryKey: trpc.grubhub.pathKey() });
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't confirm the order.")),
    })
  );
  return {
    rows: (list.data?.items ?? []).map((o) => fromGrubhubOrder(o, timezone)),
    nextCursor: list.data?.nextCursor ?? null,
    isPending: enabled && list.isPending,
    isPlaceholder: list.isPlaceholderData,
    summary: summary.data ? { ...summary.data, estPayoutCents: null, commissionBps: null } : null,
    summaryPending: enabled && summary.isPending,
    timezone,
    canAct,
    act: (id) => confirm.mutate({ projectId, id, waitTimeMinutes: 20 }),
    acting: confirm.isPending,
  };
}

function Feed({
  projectId,
  providers,
  days,
  status,
  openKey,
  setOpenKey,
  toolbar,
}: {
  projectId: string;
  providers: readonly DeliveryAppId[];
  days: Days;
  status: StatusFilter;
  openKey: string | null;
  setOpenKey: (key: string | null) => void;
  toolbar: React.ReactNode;
}) {
  const role = useProject()?.role;
  const fullAccess = role === "full-access";
  const single = providers.length === 1 ? providers[0]! : null;
  // Paging only when one app is shown; "All apps" merges each app's newest page.
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = single ? cursors.at(-1) : undefined;
  const uber = useUberFeed({ projectId, enabled: providers.includes("uber-eats"), days, status, cursor });
  const grubhub = useGrubhubFeed({ projectId, enabled: providers.includes("grubhub"), days, status, cursor });
  const feeds: Record<"uber-eats" | "grubhub", ProviderFeed> = { "uber-eats": uber, grubhub };
  const activeFeeds = providers.filter((p): p is "uber-eats" | "grubhub" => p in feeds).map((p) => feeds[p]);

  const rows = sortRows(activeFeeds.flatMap((f) => f.rows));
  const anyPending = activeFeeds.some((f) => f.isPending);
  const anyPlaceholder = activeFeeds.some((f) => f.isPlaceholder);
  const summaryPending = activeFeeds.some((f) => f.summaryPending);
  const summaries = activeFeeds.map((f) => f.summary).filter((s): s is NonNullable<ProviderFeed["summary"]> => !!s);
  const orders = summaries.reduce((n, s) => n + s.orders, 0);
  const salesCents = summaries.reduce((n, s) => n + s.salesCents, 0);
  const none = summaries.length === 0 || orders === 0;
  const currency = summaries.find((s) => s.currency)?.currency ?? null;
  const uberSummary = providers.includes("uber-eats") ? uber.summary : null;
  const canActAny = activeFeeds.some((f) => f.canAct);
  const nextCursor = single ? feeds[single as "uber-eats" | "grubhub"]?.nextCursor ?? null : null;
  const moreElsewhere = !single && activeFeeds.some((f) => f.nextCursor);
  const open = parseOrderKey(openKey);

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
      width: canActAny ? "170px" : "120px",
      align: "end",
      cell: (o) => {
        const feed = o.provider in feeds ? feeds[o.provider as "uber-eats" | "grubhub"] : null;
        return feed?.canAct && o.awaitingAccept ? (
          <Button
            size="sm"
            variant="primary"
            icon={<Check className="size-4" />}
            disabled={feed.acting}
            onClick={(e) => {
              e.stopPropagation();
              feed.act(o.id);
            }}
          >
            {o.provider === "grubhub" ? "Confirm" : "Accept"}
          </Button>
        ) : (
          <Badge tone={o.tone}>{o.stateLabel}</Badge>
        );
      },
    },
  ];

  return (
    <>
      {summaryPending ? (
        <Skeleton className="h-[88px] rounded-card" />
      ) : (
        <KpiGrid
          dim={none}
          items={[
            { label: "Orders", value: none ? "—" : String(orders) },
            { label: "Sales", value: none ? "—" : money(salesCents, currency), sub: providers.includes("grubhub") ? "Grubhub: before commission" : undefined },
            { label: "Average order", value: none ? "—" : money(Math.round(salesCents / orders), currency) },
            {
              label: "Est. payout",
              value: none || !uberSummary || uberSummary.estPayoutCents == null ? "—" : money(uberSummary.estPayoutCents, uberSummary.currency),
              sub: !providers.includes("uber-eats")
                ? "Grubhub payouts are in Grubhub for Restaurants"
                : uberSummary && uberSummary.commissionBps == null
                  ? "Add your commission rate in Uber Eats"
                  : providers.includes("grubhub")
                    ? "Uber Eats only"
                    : undefined,
            },
          ]}
        />
      )}
      <Card className={cn(anyPlaceholder && "opacity-60")}>
        {toolbar}
        {anyPending ? (
          <div className="p-6">
            <Skeleton className="h-[180px] rounded-card" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(o) => orderKey(o.provider, o.id)}
            minWidth={760}
            onRowClick={(o) => setOpenKey(orderKey(o.provider, o.id))}
            empty={
              <EmptyState
                icon={<ReceiptText className="size-5" />}
                title="No orders in this period"
                text="Try a longer range or another status."
              />
            }
          />
        )}
        {single && (cursors.length > 0 || nextCursor) && (
          <div className="flex justify-end gap-2 border-t border-divider px-6 py-3">
            <Button size="sm" disabled={cursors.length === 0} onClick={() => setCursors((c) => c.slice(0, -1))}>
              Newer
            </Button>
            <Button size="sm" disabled={!nextCursor} onClick={() => nextCursor && setCursors((c) => [...c, nextCursor])}>
              Older
            </Button>
          </div>
        )}
        {moreElsewhere && (
          <p className="border-t border-divider px-6 py-3 text-[13px] text-dim">Showing each app&apos;s newest orders. Pick one app above to page further back.</p>
        )}
      </Card>
      <UberOrderDialog
        orderId={open?.provider === "uber-eats" ? open.id : null}
        timezone={uber.timezone}
        canAccept={uber.canAct}
        onClose={() => setOpenKey(null)}
      />
      <GrubhubOrderDialog
        orderId={open?.provider === "grubhub" ? open.id : null}
        timezone={grubhub.timezone}
        canAct={grubhub.canAct}
        fullAccess={fullAccess}
        onClose={() => setOpenKey(null)}
      />
    </>
  );
}
