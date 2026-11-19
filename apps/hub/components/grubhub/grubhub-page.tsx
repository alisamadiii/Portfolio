"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { Check, Pause, Play, RefreshCw, Search, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";
import { useTRPC } from "@workspace/trpc/client";
import { INTEGRATION_META } from "@workspace/trpc/lib/grubhub-constants";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { GrubhubLogo } from "@/components/ds/brand-logos";
import { PageHeader } from "@/components/ds/layout/page-header";
import { Badge, StatusText } from "@/components/ds/ui/badge";
import { Button } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { Field, Input, Select } from "@/components/ds/ui/field";
import { EmptyState, KpiGrid } from "@/components/ds/ui/misc";
import { SegmentedTabs } from "@/components/ds/ui/tabs";
import { useProject } from "@/hooks/use-project";
import { useProjectId } from "@/hooks/use-repo";
import { isAdminUser } from "@/lib/authz-shared";
import { handleCmsError } from "@/lib/trpc-errors";

import { FULFILLMENT_LABELS, itemsSummary, localTime, money, STATUS_META } from "./format";
import { OrderDialog, useCountdown } from "./order-dialog";

type Data = RouterOutputs["grubhub"]["get"];
type Store = NonNullable<Data["store"]>;
type Order = RouterOutputs["grubhub"]["orders"]["items"][number];
type Merchant = RouterOutputs["grubhub"]["lookupMerchant"];

/** Grubhub app: link the store, confirm and ready orders, pause the store. */
export function GrubhubPage() {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const fullAccess = useProject()?.role === "full-access";
  const status = useQuery(trpc.grubhub.get.queryOptions({ projectId }));

  const header = (
    <PageHeader
      title="Grubhub"
      description="Grubhub orders for your restaurant. Confirm or reject new orders, mark them ready, and pause the store when the kitchen is slammed."
      docs="client-hub/grubhub"
    />
  );

  if (status.isPending) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Skeleton className="h-[240px] rounded-card" />
      </div>
    );
  }
  if (status.isError) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Card>
          <EmptyState
            icon={<UtensilsCrossed className="size-5" />}
            title="Couldn't load Grubhub"
            text={handleCmsError(status.error, "Try again in a moment.")}
          />
        </Card>
      </div>
    );
  }

  const data = status.data;
  return (
    <div className="flex flex-col gap-6">
      {header}
      {!data.configured ? (
        <Card>
          <EmptyState
            icon={<GrubhubLogo className="size-5 rounded-[3px]" />}
            title="Grubhub isn't set up yet"
            text="The Grubhub connection is still being set up on our side. Check back soon."
          />
        </Card>
      ) : data.store ? (
        <>
          <StoreCard store={data.store} env={data.env} fullAccess={fullAccess} />
          <Stats />
          <OrdersTable store={data.store} />
        </>
      ) : (
        <ConnectCard fullAccess={fullAccess} env={data.env} />
      )}
    </div>
  );
}

/** Two steps: type the merchant ID, confirm the restaurant Grubhub returns. */
function ConnectCard({ fullAccess, env }: { fullAccess: boolean; env: Data["env"] }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const [merchantId, setMerchantId] = useState("");
  const [found, setFound] = useState<Merchant | null>(null);
  const lookup = useMutation(
    trpc.grubhub.lookupMerchant.mutationOptions({
      onSuccess: (m) => setFound(m),
      onError: (error) => toast.error(handleCmsError(error, "Grubhub didn't recognise that merchant ID.")),
    })
  );
  const connect = useMutation(
    trpc.grubhub.connect.mutationOptions({
      onSuccess: () => {
        toast.success("Grubhub store linked. We'll ask Grubhub to switch the integration on.");
        void queryClient.invalidateQueries({ queryKey: trpc.grubhub.pathKey() });
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't connect that store.")),
    })
  );
  const valid = /^[\w-]{1,60}$/.test(merchantId.trim());

  if (!fullAccess) {
    return (
      <Card>
        <EmptyState
          icon={<GrubhubLogo className="size-5 rounded-[3px]" />}
          title="Connect your Grubhub store"
          text="The site owner hasn't connected Grubhub yet."
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title={found ? "Is this your restaurant?" : "Connect your Grubhub store"} divided />
      <div className="flex flex-col gap-4 p-6 text-sm">
        {found ? (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-inner border border-line px-4 py-3">
              <GrubhubLogo className="size-8 shrink-0 rounded-[5px]" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium text-ink">{found.name}</span>
                <span className="truncate text-[13px] text-dim">{found.address ?? `Merchant ${found.merchantId}`}</span>
              </div>
              {found.accountStatus && <Badge tone="neutral">{found.accountStatus.toLowerCase()}</Badge>}
            </div>
            <p className="text-dim">
              Linking it puts this store&apos;s Grubhub orders on this site. Each Grubhub store connects to one project.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                disabled={connect.isPending}
                onClick={() => connect.mutate({ projectId, merchantId: found.merchantId })}
              >
                {connect.isPending ? "Linking…" : "This is my restaurant"}
              </Button>
              <Button disabled={connect.isPending} onClick={() => setFound(null)}>
                Not it
              </Button>
            </div>
          </>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) lookup.mutate({ projectId, merchantId: merchantId.trim() });
            }}
          >
            <p className="text-dim">
              Grubhub has no sign-in button for partners, so we link the store by its merchant ID instead. Find it in Grubhub
              for Restaurants, or ask your Grubhub account manager. We check it with Grubhub before anything is saved.
            </p>
            <Field label="Grubhub merchant ID" hint="A number, e.g. 10004116752." className="sm:w-[360px]">
              <Input
                value={merchantId}
                inputMode="numeric"
                autoComplete="off"
                maxLength={60}
                placeholder="10004116752"
                onChange={(e) => setMerchantId(e.target.value)}
              />
            </Field>
            <div>
              <Button type="submit" variant="primary" disabled={!valid || lookup.isPending} icon={<Search className="size-4" />}>
                {lookup.isPending ? "Asking Grubhub…" : "Look up"}
              </Button>
            </div>
          </form>
        )}
        {env === "preprod" && (
          <p className="border-t border-divider pt-3 text-[13px] text-dim">
            Test mode: connected to Grubhub&apos;s pre-production environment, not live stores.
          </p>
        )}
      </div>
    </Card>
  );
}

function StoreCard({ store, env, fullAccess }: { store: Store; env: Data["env"]; fullAccess: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const admin = isAdminUser(useCurrentUser().data?.user);
  const [pausing, setPausing] = useState<"OFFLINE" | "CLOSED_TODAY" | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.grubhub.pathKey() });
  const refresh = useMutation(
    trpc.grubhub.refresh.mutationOptions({
      onSuccess: () => {
        toast.success("Up to date.");
        void invalidate();
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't refresh.")),
    })
  );
  const online = useMutation(
    trpc.grubhub.setPosStatus.mutationOptions({
      onSuccess: () => {
        toast.success("Store is back online on Grubhub.");
        void invalidate();
      },
      onError: (error) => toast.error(handleCmsError(error, "Grubhub didn't take the change.")),
    })
  );
  const reopen = useMutation(
    trpc.grubhub.setClosedToday.mutationOptions({
      onSuccess: () => {
        toast.success("Store is open again on Grubhub.");
        void invalidate();
      },
      onError: (error) => toast.error(handleCmsError(error, "Grubhub didn't take the change.")),
    })
  );
  const disconnect = useMutation(
    trpc.grubhub.disconnect.mutationOptions({
      onSuccess: () => {
        toast.success("Grubhub disconnected.");
        void invalidate();
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't disconnect.")),
    })
  );

  const live = store.integrationStatus === "LIVE";
  const offline = store.posStatus === "OFFLINE";
  const integration = INTEGRATION_META[store.integrationStatus];
  const busy = online.isPending || reopen.isPending;

  return (
    <Card>
      <CardHeader
        title="Your store"
        divided
        action={
          fullAccess && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                icon={<RefreshCw className={cn("size-4", refresh.isPending && "animate-spin")} />}
                disabled={refresh.isPending}
                onClick={() => refresh.mutate({ projectId })}
              >
                Refresh
              </Button>
              {live &&
                (offline ? (
                  <Button size="sm" variant="primary" icon={<Play className="size-4" />} disabled={busy} onClick={() => online.mutate({ projectId, status: "ONLINE" })}>
                    {online.isPending ? "Going online…" : "Go online"}
                  </Button>
                ) : (
                  <>
                    {store.closedToday ? (
                      <Button size="sm" variant="primary" icon={<Play className="size-4" />} disabled={busy} onClick={() => reopen.mutate({ projectId, closed: false })}>
                        {reopen.isPending ? "Reopening…" : "Reopen today"}
                      </Button>
                    ) : (
                      <Button size="sm" icon={<Pause className="size-4" />} disabled={busy} onClick={() => setPausing("CLOSED_TODAY")}>
                        Close for today
                      </Button>
                    )}
                    <Button size="sm" variant="dark" icon={<Pause className="size-4" />} disabled={busy} onClick={() => setPausing("OFFLINE")}>
                      Go offline
                    </Button>
                  </>
                ))}
            </div>
          )
        }
      />
      <div className="flex flex-col gap-4 p-6 text-sm">
        <div className="flex flex-wrap items-center gap-3 rounded-inner border border-line px-4 py-3">
          <GrubhubLogo className="size-8 shrink-0 rounded-[5px]" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium text-ink">{store.name}</span>
            <span className="truncate text-[13px] text-dim">{store.address ?? `Merchant ${store.merchantId}`}</span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            {store.integrationStatus === "DEACTIVATED" ? (
              <StatusText tone="danger">Switched off</StatusText>
            ) : !live ? (
              <StatusText tone="neutral">Waiting for Grubhub</StatusText>
            ) : offline ? (
              <StatusText tone="danger">Offline</StatusText>
            ) : store.closedToday ? (
              <StatusText tone="danger">Closed for today</StatusText>
            ) : store.acceptingOnlineOrders !== false ? (
              <StatusText tone="success">Accepting orders</StatusText>
            ) : (
              <StatusText tone="neutral">Not accepting orders</StatusText>
            )}
            {store.posStatusReason && (offline || store.closedToday) && (
              <span className="max-w-[240px] truncate text-xs text-dim">{store.posStatusReason}</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <Badge tone={integration.tone} dot>
            {integration.label}
          </Badge>
          <span className="text-dim">{integration.text}</span>
        </div>
        {store.availability && store.availabilityAt && (
          <p className="rounded-inner border border-line bg-canvas px-4 py-3 text-dim">
            Grubhub reports the store {store.availability === "ONLINE" ? "online" : "paused"}
            {store.availabilityEndTime && store.availability !== "ONLINE" && ` until ${localTime(store.availabilityEndTime, store.timezone)}`}
            {" "}({formatDistanceToNow(parseISO(store.availabilityAt), { addSuffix: true })}).
            {store.availabilityReason && store.availability !== "ONLINE" && ` ${store.availabilityReason}`}
          </p>
        )}
        {store.lastError && (
          <p className="rounded-inner border border-line bg-canvas px-4 py-3 text-dim">
            The last check with Grubhub didn&apos;t finish: {store.lastError}. We try again every hour, or press Refresh.
          </p>
        )}
        <span className="text-[13px] text-dim">
          {store.lastSyncedAt ? `Checked ${formatDistanceToNow(parseISO(store.lastSyncedAt), { addSuffix: true })}` : "Not checked yet"}
          {" · "}merchant {store.merchantId}
          {env === "preprod" && " · test mode"}
        </span>
        {admin && fullAccess && <AdminLine store={store} env={env} />}
        {fullAccess && (
          <button
            type="button"
            className="self-start text-[13px] text-dim hover:text-ink hover:underline"
            onClick={() => setDisconnecting(true)}
          >
            Disconnect and delete saved orders
          </button>
        )}
      </div>
      <Dialog open={!!pausing} onOpenChange={(open) => !open && setPausing(null)}>
        <DialogContent className="sm:max-w-[440px]">
          {pausing && <PauseDialogContent store={store} kind={pausing} onClose={() => setPausing(null)} />}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={disconnecting}
        onOpenChange={setDisconnecting}
        title="Disconnect Grubhub?"
        description="The store is unlinked from this site and every order saved here is deleted. Your store on Grubhub isn't touched; we ask Grubhub to switch the integration off. This can't be undone."
        confirmLabel="Disconnect"
        danger
        onConfirm={() => disconnect.mutate({ projectId })}
      />
    </Card>
  );
}

function PauseDialogContent({ store, kind, onClose }: { store: Store; kind: "OFFLINE" | "CLOSED_TODAY"; onClose: () => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const [reason, setReason] = useState("");
  const finish = (message: string) => () => {
    toast.success(message);
    void queryClient.invalidateQueries({ queryKey: trpc.grubhub.pathKey() });
    onClose();
  };
  const onError = (error: unknown) => toast.error(handleCmsError(error, "Grubhub didn't take the change."));
  const offline = useMutation(trpc.grubhub.setPosStatus.mutationOptions({ onSuccess: finish("Store is offline on Grubhub until you go back online."), onError }));
  const close = useMutation(trpc.grubhub.setClosedToday.mutationOptions({ onSuccess: finish("Store is closed on Grubhub for the rest of today."), onError }));
  const pending = offline.isPending || close.isPending;
  const isOffline = kind === "OFFLINE";

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isOffline ? "Take the store offline" : "Close for the rest of today"}</DialogTitle>
        <DialogDescription>
          {isOffline
            ? `${store.name} disappears from Grubhub until you press Go online. Orders already in progress aren't affected.`
            : `${store.name} shows as closed on Grubhub until its next opening time. Orders already in progress aren't affected.`}
        </DialogDescription>
      </DialogHeader>
      <Field label="Reason" optional hint="Only Grubhub sees this.">
        <Input value={reason} maxLength={200} placeholder="Kitchen is behind" onChange={(e) => setReason(e.target.value)} />
      </Field>
      <DialogFooter>
        <Button onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button
          variant="dark"
          disabled={pending}
          onClick={() =>
            isOffline
              ? offline.mutate({ projectId, status: "OFFLINE", reason: reason.trim() || undefined })
              : close.mutate({ projectId, closed: true, reason: reason.trim() || undefined })
          }
        >
          {pending ? "Saving…" : isOffline ? "Go offline" : "Close for today"}
        </Button>
      </DialogFooter>
    </>
  );
}

/** Admin only: the switches Grubhub's onboarding needs while the menu side is still manual. */
function AdminLine({ store, env }: { store: Store; env: Data["env"] }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const [jobId, setJobId] = useState(store.activationJobId ?? "");
  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.grubhub.pathKey() });
  const onError = (fallback: string) => (error: unknown) => toast.error(handleCmsError(error, fallback));
  const activate = useMutation(
    trpc.grubhub.activate.mutationOptions({
      onSuccess: (r) => {
        toast.success(r.kickedOff === false ? `Grubhub didn't start it: ${r.reasons.join("; ") || "no reason"}` : "Activation requested. Grubhub reports back by webhook.");
        void invalidate();
      },
      onError: onError("Grubhub didn't take the activation."),
    })
  );
  const deactivate = useMutation(trpc.grubhub.deactivate.mutationOptions({ onSuccess: () => { toast.success("Integration switched off."); void invalidate(); }, onError: onError("Couldn't deactivate.") }));
  const setStatus = useMutation(trpc.grubhub.setIntegrationStatus.mutationOptions({ onSuccess: () => void invalidate(), onError: onError("Couldn't change the status.") }));
  const testOrder = useMutation(
    trpc.grubhub.createTestOrder.mutationOptions({
      onSuccess: () => toast.success("Test order requested. It arrives through the webhook."),
      onError: onError("Couldn't create a test order."),
    })
  );
  const busy = activate.isPending || deactivate.isPending || setStatus.isPending || testOrder.isPending;

  return (
    <div className="flex flex-col gap-3 rounded-inner border border-dashed border-line p-4">
      <span className="text-[13px] font-medium text-dim">Admin</span>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Menu ingestion job id" hint="From POST /pos/v1/menu/ingestion (phase 2)." className="w-full sm:w-[320px]">
          <Input value={jobId} onChange={(e) => setJobId(e.target.value)} placeholder="123e4567-e89b-12d3-a456-426614174000" />
        </Field>
        <Button size="sm" disabled={busy || !jobId.trim()} onClick={() => activate.mutate({ projectId, jobId: jobId.trim() })}>
          {activate.isPending ? "Requesting…" : "Activate on Grubhub"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {store.integrationStatus === "LIVE" ? (
          <Button size="sm" disabled={busy} onClick={() => setStatus.mutate({ projectId, status: "PENDING" })}>
            Back to pending
          </Button>
        ) : (
          <Button size="sm" disabled={busy} onClick={() => setStatus.mutate({ projectId, status: "LIVE" })}>
            Mark live
          </Button>
        )}
        {store.integrationStatus !== "DEACTIVATED" && (
          <Button size="sm" disabled={busy} onClick={() => deactivate.mutate({ projectId })}>
            Deactivate on Grubhub
          </Button>
        )}
        {env === "preprod" && (
          <>
            <Button size="sm" disabled={busy} onClick={() => testOrder.mutate({ projectId, delivery: false })}>
              Test order: pickup
            </Button>
            <Button size="sm" disabled={busy} onClick={() => testOrder.mutate({ projectId, delivery: true })}>
              Test order: delivery
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function Stats() {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const stats = useQuery(trpc.grubhub.stats.queryOptions({ projectId }));
  if (stats.isPending) return <Skeleton className="h-[88px] rounded-card" />;
  const s = stats.data;
  const none = !s || s.total === 0;
  const avg = s && s.month > 0 ? Math.round(s.salesMonthCents / s.month) : null;
  return (
    <KpiGrid
      dim={none}
      items={[
        { label: "Orders today", value: none ? "—" : String(s.today) },
        { label: "Orders, 7 days", value: none ? "—" : String(s.week) },
        { label: "Sales, 30 days", value: none ? "—" : money(s.salesMonthCents, s.currency), sub: none ? undefined : `${s.month} orders, before commission` },
        { label: "Tips, 30 days", value: none ? "—" : money(s.tipsMonthCents, s.currency) },
        { label: "Open orders", value: none ? "—" : String(s.open), sub: none || !s.new ? undefined : `${s.new} new` },
        { label: "Average order", value: none || avg == null ? "—" : money(avg, s.currency) },
      ]}
    />
  );
}

const FILTERS = [
  { id: "open", label: "Open" },
  { id: "all", label: "All" },
] as const;

function OrdersTable({ store }: { store: Store }) {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const role = useProject()?.role;
  const fullAccess = role === "full-access";
  const canAct = store.integrationStatus === "LIVE" && (fullAccess || role === "content-editor");
  const timezone = store.timezone;
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [cursors, setCursors] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const cursor = cursors.at(-1);
  const list = useQuery({
    ...trpc.grubhub.orders.queryOptions({ projectId, cursor, status: filter === "open" ? "open" : undefined }),
    placeholderData: keepPreviousData,
    // Faster while something is cooking.
    refetchInterval: (q) =>
      q.state.data?.items.some((o) => o.status === "RESTAURANT_CONFIRMABLE" || o.status === "CONFIRMED" || o.status === "PICKUP_READY") ? 30_000 : 60_000,
  });

  const columns: Column<Order>[] = [
    {
      key: "order",
      header: "Order",
      width: "minmax(130px, 0.8fr)",
      cell: (o) => (
        <div className="flex flex-col gap-0.5 py-3">
          <span className="flex items-center gap-1.5 font-medium text-ink">
            #{o.orderNumber}
            {o.isTest && <Badge tone="neutral">Test</Badge>}
          </span>
          <span className="text-[13px] text-dim">{o.dinerName ?? "Customer"}</span>
        </div>
      ),
    },
    {
      key: "placed",
      header: "Placed",
      width: "minmax(150px, 1fr)",
      cell: (o) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-ink">
            {format(parseISO(o.placedAt), "MMM d")}, {localTime(o.placedAt, timezone)}
          </span>
          <span className="text-[13px] text-dim">
            {FULFILLMENT_LABELS[o.fulfillment]}
            {o.scheduling === "FUTURE" && o.whenFor && ` · for ${format(parseISO(o.whenFor), "MMM d")}, ${localTime(o.whenFor, timezone)}`}
          </span>
        </div>
      ),
    },
    { key: "items", header: "Items", width: "minmax(200px, 2fr)", cell: (o) => <span className="line-clamp-2 text-ink">{itemsSummary(o.items)}</span> },
    {
      key: "sales",
      header: "Sales",
      width: "100px",
      align: "end",
      cell: (o) => <span className="font-medium text-ink">{money(o.merchantTotalCents, "USD")}</span>,
    },
    {
      key: "status",
      header: "Status",
      width: canAct ? "190px" : "120px",
      align: "end",
      cell: (o) => <StatusCell order={o} canAct={canAct} onOpen={() => setOpenId(o.id)} />,
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Orders"
        divided
        action={
          <SegmentedTabs
            label="Filter orders"
            value={filter}
            onChange={(id) => {
              setFilter(id as "open" | "all");
              setCursors([]);
            }}
            items={[...FILTERS]}
          />
        }
      />
      {list.isPending ? (
        <div className="p-6">
          <Skeleton className="h-[180px] rounded-card" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={list.data?.items ?? []}
          rowKey={(o) => o.id}
          minWidth={740}
          onRowClick={(o) => setOpenId(o.id)}
          empty={
            <EmptyState
              icon={<UtensilsCrossed className="size-5" />}
              title={filter === "open" ? "No open orders" : "No orders yet"}
              text={
                store.integrationStatus === "LIVE"
                  ? "New Grubhub orders show up here within seconds of being placed."
                  : "Orders start arriving once Grubhub switches the integration on."
              }
            />
          }
        />
      )}
      {(cursors.length > 0 || list.data?.nextCursor) && (
        <div className="flex justify-end gap-2 border-t border-divider px-6 py-3">
          <Button size="sm" disabled={cursors.length === 0} onClick={() => setCursors((c) => c.slice(0, -1))}>
            Newer
          </Button>
          <Button size="sm" disabled={!list.data?.nextCursor} onClick={() => list.data?.nextCursor && setCursors((c) => [...c, list.data!.nextCursor!])}>
            Older
          </Button>
        </div>
      )}
      <OrderDialog orderId={openId} timezone={timezone} canAct={canAct} fullAccess={fullAccess} onClose={() => setOpenId(null)} />
    </Card>
  );
}

/** Status badge, or an inline Confirm with the clock on a new order. */
function StatusCell({ order: o, canAct, onOpen }: { order: Order; canAct: boolean; onOpen: () => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const { remaining, label } = useCountdown(o.placedAt);
  const confirm = useMutation(
    trpc.grubhub.confirmOrder.mutationOptions({
      onSuccess: () => {
        toast.success(`Order #${o.orderNumber} confirmed.`);
        void queryClient.invalidateQueries({ queryKey: trpc.grubhub.pathKey() });
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't confirm the order.")),
    })
  );
  const meta = STATUS_META[o.status];
  if (canAct && o.status === "RESTAURANT_CONFIRMABLE") {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          size="sm"
          variant="primary"
          icon={<Check className="size-4" />}
          disabled={confirm.isPending}
          onClick={(e) => {
            e.stopPropagation();
            confirm.mutate({ projectId, id: o.id, waitTimeMinutes: 20 });
          }}
        >
          {confirm.isPending ? "Confirming…" : "Confirm, 20 min"}
        </Button>
        <button
          type="button"
          className="text-xs tabular-nums text-dim hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          {remaining > 0 ? `${label} left · other time` : "window passed"}
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-end gap-0.5">
      <Badge tone={meta.tone}>{meta.label}</Badge>
      {o.cancelRequestStatus && <span className="text-xs text-dim">cancel {o.cancelRequestStatus.toLowerCase()}</span>}
    </div>
  );
}
