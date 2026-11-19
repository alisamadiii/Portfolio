"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { Check, ExternalLink, MapPin, Pause, Percent, Play, RefreshCw, UtensilsCrossed } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";
import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { PAUSE_CHOICES, type PauseChoice } from "@workspace/trpc/lib/uber-eats-constants";
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

import { UberEatsLogo } from "@/components/ds/brand-logos";
import { PageHeader } from "@/components/ds/layout/page-header";
import { Badge, StatusText, type BadgeTone } from "@/components/ds/ui/badge";
import { Button, ButtonAnchor } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { Field, Input, Select } from "@/components/ds/ui/field";
import { EmptyState, KpiGrid } from "@/components/ds/ui/misc";
import { useProject } from "@/hooks/use-project";
import { useProjectId } from "@/hooks/use-repo";
import { isAdminUser } from "@/lib/authz-shared";
import { handleCmsError } from "@/lib/trpc-errors";

import { OrderDialog } from "./order-dialog";

type Data = RouterOutputs["uberEats"]["get"];
type Store = NonNullable<Data["store"]>;
type Order = RouterOutputs["uberEats"]["orders"]["items"][number];

const RETURN_TOASTS: Record<string, () => void> = {
  connected: () => toast.success("Uber Eats connected."),
  choose: () => toast.success("Signed in to Uber Eats. Pick the store to connect."),
  nostores: () => toast.error("That Uber account has no Uber Eats stores."),
  taken: () => toast.error("That store is already connected to another project."),
  denied: () => toast.error("Uber Eats access was declined."),
  error: () => toast.error("Couldn't connect Uber Eats. Try again."),
};

const PAUSE_LABELS: Record<PauseChoice, string> = {
  "30m": "30 minutes",
  "1h": "1 hour",
  "2h": "2 hours",
  today: "Rest of today",
  indefinite: "Until I resume",
};

const STATE_LABELS: Record<Order["state"], { label: string; tone: BadgeTone }> = {
  CREATED: { label: "New", tone: "coral" },
  ACCEPTED: { label: "In progress", tone: "info" },
  FINISHED: { label: "Completed", tone: "success" },
  CANCELED: { label: "Canceled", tone: "neutral" },
  DENIED: { label: "Denied", tone: "neutral" },
  UNKNOWN: { label: "Unknown", tone: "neutral" },
};

const TYPE_LABELS: Record<Order["type"], string> = {
  PICK_UP: "Pickup",
  DINE_IN: "Dine in",
  DELIVERY_BY_UBER: "Uber delivery",
  DELIVERY_BY_RESTAURANT: "Own delivery",
  UNKNOWN: "—",
};

const money = (cents: number | null, currency: string | null) =>
  cents == null
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(cents / 100);

/** A time in the store's own timezone, e.g. "3:30 PM". */
const localTime = (iso: string, timezone: string | null) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone || undefined,
  }).format(parseISO(iso));

/** Uber Eats app: the store's orders and sales, plus Pause / Resume. */
export function UberEatsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const fullAccess = useProject()?.role === "full-access";
  const [returned, setReturned] = useQueryState("uber", parseAsString);
  const status = useQuery(trpc.uberEats.get.queryOptions({ projectId }));

  // Back from Uber's consent screen (the api callback already did the work).
  useEffect(() => {
    if (!returned) return;
    RETURN_TOASTS[returned]?.();
    void setReturned(null);
    void queryClient.invalidateQueries({ queryKey: trpc.uberEats.pathKey() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returned]);

  const header = (
    <PageHeader
      title="Uber Eats"
      description="Orders and sales from your Uber Eats store, and a Pause button for when the kitchen is slammed. Orders are still accepted on your Uber Eats tablet."
      docs="client-hub/uber-eats"
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
            title="Couldn't load Uber Eats"
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
            icon={<UberEatsLogo className="size-5 rounded-[3px]" />}
            title="Uber Eats isn't set up yet"
            text="The Uber Eats connection is still being set up on our side. Check back soon."
          />
        </Card>
      ) : data.store ? (
        <>
          <StoreCard store={data.store} env={data.env} fullAccess={fullAccess} />
          <Stats />
          <OrdersTable store={data.store} />
        </>
      ) : data.pending ? (
        <StorePicker stores={data.pending} fullAccess={fullAccess} />
      ) : (
        <ConnectCard fullAccess={fullAccess} env={data.env} />
      )}
    </div>
  );
}

function ConnectCard({ fullAccess, env }: { fullAccess: boolean; env: Data["env"] }) {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const admin = isAdminUser(useCurrentUser().data?.user);
  const connect = useMutation(
    trpc.uberEats.connectUrl.mutationOptions({
      onSuccess: ({ url }) => window.location.assign(url),
      onError: (error) => toast.error(handleCmsError(error, "Couldn't start the Uber Eats connection.")),
    })
  );

  return (
    <>
      <Card>
        <EmptyState
          icon={<UberEatsLogo className="size-5 rounded-[3px]" />}
          title="Connect your Uber Eats store"
          text={
            fullAccess
              ? "Sign in with the Uber account that manages your restaurant. Uber asks you to allow Client Hub to see your stores; you won't share your password with us."
              : "The site owner hasn't connected Uber Eats yet."
          }
          action={
            fullAccess ? (
              <Button variant="primary" disabled={connect.isPending} onClick={() => connect.mutate({ projectId })}>
                {connect.isPending ? "Opening Uber…" : "Connect Uber Eats"}
              </Button>
            ) : undefined
          }
        />
        {env === "sandbox" && (
          <p className="border-t border-divider px-6 py-3 text-[13px] text-dim">
            Test mode: connected to Uber&apos;s sandbox, not live stores.
          </p>
        )}
      </Card>
      {admin && fullAccess && <AdminAttachCard />}
    </>
  );
}

/** Admin only: stores Uber provisioned straight to the agency app (sandbox test stores). */
function AdminAttachCard() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const stores = useQuery(trpc.uberEats.appStores.queryOptions({ projectId }, { retry: false }));
  const attach = useMutation(
    trpc.uberEats.attachStore.mutationOptions({
      onSuccess: () => {
        toast.success("Store attached.");
        void queryClient.invalidateQueries({ queryKey: trpc.uberEats.pathKey() });
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't attach that store.")),
    })
  );

  return (
    <Card>
      <CardHeader title="Admin: stores provisioned to the app" divided />
      <div className="flex flex-col gap-3 p-6 text-sm">
        <p className="text-dim">
          Stores Uber already gave the agency app access to (sandbox test stores, or a merchant who added us in
          Uber Eats Manager). Attaching skips the merchant login.
        </p>
        {stores.isPending ? (
          <Skeleton className="h-10 rounded-control" />
        ) : stores.isError ? (
          <p className="text-dim">{handleCmsError(stores.error, "Couldn't list the app's stores.")}</p>
        ) : stores.data.length === 0 ? (
          <p className="text-dim">None yet. Ask Uber integration support for sandbox test stores.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-divider rounded-inner border border-line">
            {stores.data.map((s) => (
              <li key={s.storeId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium text-ink">{s.name}</span>
                  <span className="truncate text-[13px] text-dim">{s.address ?? s.storeId}</span>
                </div>
                {s.boundToProjectId && s.boundToProjectId !== projectId ? (
                  <Badge tone="neutral">Used by another project</Badge>
                ) : (
                  <Button
                    size="sm"
                    disabled={attach.isPending}
                    onClick={() => attach.mutate({ projectId, storeId: s.storeId })}
                  >
                    Attach
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function StorePicker({ stores, fullAccess }: { stores: NonNullable<Data["pending"]>; fullAccess: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const [picked, setPicked] = useState<string | null>(null);
  const activate = useMutation(
    trpc.uberEats.activate.mutationOptions({
      onSuccess: () => {
        toast.success("Uber Eats connected.");
        void queryClient.invalidateQueries({ queryKey: trpc.uberEats.pathKey() });
      },
      onError: (error) => {
        toast.error(handleCmsError(error, "Couldn't connect that store."));
        void queryClient.invalidateQueries({ queryKey: trpc.uberEats.pathKey() });
      },
    })
  );

  return (
    <Card>
      <CardHeader title="Which store is this website for?" divided />
      <div className="flex flex-col gap-4 p-6 text-sm">
        <p className="text-dim">
          Your Uber account manages more than one store. Pick the one this site belongs to. You can connect
          the others from their own projects.
        </p>
        <ul className="flex flex-col divide-y divide-divider rounded-inner border border-line">
          {stores.map((s) => (
            <li key={s.storeId} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <MapPin className="size-4 shrink-0 text-dim" aria-hidden />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium text-ink">{s.name}</span>
                {s.address && <span className="truncate text-[13px] text-dim">{s.address}</span>}
              </div>
              {fullAccess && (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={activate.isPending}
                  onClick={() => {
                    setPicked(s.storeId);
                    activate.mutate({ projectId, storeId: s.storeId });
                  }}
                >
                  {activate.isPending && picked === s.storeId ? "Connecting…" : "Use this store"}
                </Button>
              )}
            </li>
          ))}
        </ul>
        <p className="text-[13px] text-dim">This choice expires after 30 minutes; after that, press Connect again.</p>
      </div>
    </Card>
  );
}

function StoreCard({ store, env, fullAccess }: { store: Store; env: Data["env"]; fullAccess: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const [pausing, setPausing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.uberEats.pathKey() });
  const refresh = useMutation(
    trpc.uberEats.refresh.mutationOptions({
      onSuccess: () => {
        toast.success("Up to date.");
        void invalidate();
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't refresh.")),
    })
  );
  const resume = useMutation(
    trpc.uberEats.setStatus.mutationOptions({
      onSuccess: () => {
        toast.success("Store is back online.");
        void invalidate();
      },
      onError: (error) => toast.error(handleCmsError(error, "Uber Eats didn't take the change.")),
    })
  );
  const disconnect = useMutation(
    trpc.uberEats.disconnect.mutationOptions({
      onSuccess: () => {
        toast.success("Uber Eats disconnected. Remove Client Hub in Uber Eats Manager to revoke access fully.");
        void invalidate();
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't disconnect.")),
    })
  );

  const paused = store.onlineStatus === "PAUSED";
  const online = store.onlineStatus === "ONLINE";

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
              {store.integrationEnabled &&
                (paused ? (
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<Play className="size-4" />}
                    disabled={resume.isPending}
                    onClick={() => resume.mutate({ projectId, status: "ONLINE" })}
                  >
                    {resume.isPending ? "Resuming…" : "Resume orders"}
                  </Button>
                ) : (
                  <Button size="sm" variant="dark" icon={<Pause className="size-4" />} onClick={() => setPausing(true)}>
                    Pause orders
                  </Button>
                ))}
            </div>
          )
        }
      />
      <div className="flex flex-col gap-4 p-6 text-sm">
        <div className="flex flex-wrap items-center gap-3 rounded-inner border border-line px-4 py-3">
          <UberEatsLogo className="size-8 shrink-0 rounded-[5px]" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium text-ink">{store.name}</span>
            {store.address && <span className="truncate text-[13px] text-dim">{store.address}</span>}
          </div>
          <div className="flex flex-col items-end gap-0.5">
            {!store.integrationEnabled ? (
              <StatusText tone="danger">Access removed</StatusText>
            ) : online ? (
              <StatusText tone="success">Accepting orders</StatusText>
            ) : paused ? (
              <StatusText tone="danger">Paused</StatusText>
            ) : (
              <StatusText tone="neutral">Status unknown</StatusText>
            )}
            {paused && store.pausedUntil && (
              <span className="text-xs text-dim">until {localTime(store.pausedUntil, store.timezone)}</span>
            )}
          </div>
        </div>
        {!store.integrationEnabled && (
          <p className="rounded-inner border border-line bg-canvas px-4 py-3 text-dim">
            Uber Eats says Client Hub no longer has access to this store. Disconnect and connect again to fix it.
          </p>
        )}
        {store.lastError && store.integrationEnabled && (
          <p className="rounded-inner border border-line bg-canvas px-4 py-3 text-dim">
            The last check didn&apos;t finish. We try again every hour, or press Refresh.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {store.webUrl && (
            <ButtonAnchor href={store.webUrl} target="_blank" rel="noopener noreferrer" icon={<ExternalLink className="size-4" />}>
              Open on Uber Eats
            </ButtonAnchor>
          )}
          <span className="text-[13px] text-dim">
            {store.lastSyncedAt
              ? `Checked ${formatDistanceToNow(parseISO(store.lastSyncedAt), { addSuffix: true })}`
              : "Not checked yet"}
            {env === "sandbox" && " · test mode"}
          </span>
        </div>
        <OrderManagerLine store={store} fullAccess={fullAccess} />
        <CommissionLine store={store} fullAccess={fullAccess} />
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
      <Dialog open={pausing} onOpenChange={setPausing}>
        <DialogContent className="sm:max-w-[440px]">
          {pausing && <PauseDialogContent store={store} onClose={() => setPausing(false)} />}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={disconnecting}
        onOpenChange={setDisconnecting}
        title="Disconnect Uber Eats?"
        description="The store is unlinked from this site and every order saved here is deleted. Your store on Uber Eats isn't touched. This can't be undone."
        confirmLabel="Disconnect"
        danger
        onConfirm={() => disconnect.mutate({ projectId })}
      />
    </Card>
  );
}

function PauseDialogContent({ store, onClose }: { store: Store; onClose: () => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const [duration, setDuration] = useState<PauseChoice>("30m");
  const [reason, setReason] = useState("");
  const pause = useMutation(
    trpc.uberEats.setStatus.mutationOptions({
      onSuccess: () => {
        toast.success("Store paused. New orders stop until it's resumed.");
        void queryClient.invalidateQueries({ queryKey: trpc.uberEats.pathKey() });
        onClose();
      },
      onError: (error) => toast.error(handleCmsError(error, "Uber Eats didn't take the change.")),
    })
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Pause orders</DialogTitle>
        <DialogDescription>
          {store.name} shows as unavailable on Uber Eats until the pause ends. Orders already in progress aren&apos;t
          affected.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <Field label="For how long">
          <Select value={duration} onChange={(e) => setDuration(e.target.value as PauseChoice)}>
            {PAUSE_CHOICES.map((c) => (
              <option key={c} value={c}>
                {PAUSE_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reason" optional hint="Only Uber sees this.">
          <Input value={reason} maxLength={200} placeholder="Kitchen is behind" onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
      <DialogFooter>
        <Button onClick={onClose} disabled={pause.isPending}>
          Cancel
        </Button>
        <Button
          variant="dark"
          disabled={pause.isPending}
          onClick={() => pause.mutate({ projectId, status: "PAUSED", duration, reason: reason.trim() || undefined })}
        >
          {pause.isPending ? "Pausing…" : "Pause orders"}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * "Accept orders in Client Hub": nominates the hub as the store's order
 * manager on Uber. Off = read-only, the tablet accepts.
 */
function OrderManagerLine({ store, fullAccess }: { store: Store; fullAccess: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const [confirming, setConfirming] = useState(false);
  const toggle = useMutation(
    trpc.uberEats.setOrderManager.mutationOptions({
      onSuccess: (_, vars) => {
        toast.success(vars.enabled ? "Orders can now be accepted here." : "Back to accepting on the tablet only.");
        void queryClient.invalidateQueries({ queryKey: trpc.uberEats.pathKey() });
      },
      onError: (error) => toast.error(handleCmsError(error, "Uber Eats didn't accept the change.")),
    })
  );
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px]">
      <Check className="size-3.5 text-dim" aria-hidden />
      <span className="text-dim">Accept orders in Client Hub:</span>
      <span className="font-medium text-ink">{store.isOrderManager ? "on" : "off"}</span>
      {fullAccess && store.integrationEnabled && (
        <button
          type="button"
          className="text-coral-text hover:underline disabled:opacity-50"
          disabled={toggle.isPending}
          onClick={() => (store.isOrderManager ? toggle.mutate({ projectId, enabled: false }) : setConfirming(true))}
        >
          {toggle.isPending ? "Saving…" : store.isOrderManager ? "Turn off" : "Turn on"}
        </button>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Accept orders in Client Hub?"
        description="Client Hub becomes this store's order manager on Uber Eats. New orders can be accepted or denied here, and Uber cancels any order nobody accepts within 11 minutes. Keep the tablet nearby; you can turn this off anytime."
        confirmLabel="Turn on"
        onConfirm={() => toggle.mutate({ projectId, enabled: true })}
      />
    </div>
  );
}

/** The owner's Uber commission rate: Uber's feed doesn't carry it, so payouts are estimated from this. */
function CommissionLine({ store, fullAccess }: { store: Store; fullAccess: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(store.commissionBps != null ? String(store.commissionBps / 100) : "");
  const save = useMutation(
    trpc.uberEats.setCommission.mutationOptions({
      onSuccess: () => {
        toast.success("Commission rate saved.");
        setEditing(false);
        void queryClient.invalidateQueries({ queryKey: trpc.uberEats.pathKey() });
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't save the rate.")),
    })
  );
  const percent = store.commissionBps != null ? store.commissionBps / 100 : null;

  if (editing) {
    const parsed = Number(value);
    const valid = value.trim() !== "" && Number.isFinite(parsed) && parsed >= 0 && parsed <= 100;
    return (
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) save.mutate({ projectId, percent: parsed });
        }}
      >
        <Field label="Uber commission" hint="The marketplace fee from your Uber Eats contract. Only used for the payout estimates." className="w-full sm:w-[320px]">
          <div className="flex items-center gap-2">
            <Input type="number" inputMode="decimal" min={0} max={100} step={0.5} value={value} onChange={(e) => setValue(e.target.value)} className="w-28" />
            <span className="text-sm text-dim">%</span>
          </div>
        </Field>
        <Button type="submit" size="sm" variant="primary" disabled={!valid || save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </form>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px]">
      <Percent className="size-3.5 text-dim" aria-hidden />
      <span className="text-dim">Uber commission:</span>
      <span className="font-medium text-ink">{percent != null ? `${percent}%` : "not set"}</span>
      {fullAccess && (
        <button type="button" className="text-coral-text hover:underline" onClick={() => setEditing(true)}>
          {percent != null ? "Change" : "Add your rate for payout estimates"}
        </button>
      )}
    </div>
  );
}

function Stats() {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const stats = useQuery(trpc.uberEats.stats.queryOptions({ projectId }));
  if (stats.isPending) return <Skeleton className="h-[88px] rounded-card" />;
  const s = stats.data;
  const none = !s || s.total === 0;
  const avg = s && s.month > 0 ? Math.round(s.salesMonthCents / s.month) : null;
  const rated = !!s && s.commissionBps != null;
  return (
    <KpiGrid
      dim={none}
      items={[
        { label: "Orders today", value: none ? "—" : String(s.today) },
        { label: "Orders, 7 days", value: none ? "—" : String(s.week) },
        { label: "Sales, 30 days", value: none ? "—" : money(s.salesMonthCents, s.currency), sub: none ? undefined : `${s.month} orders` },
        { label: "Average order", value: none || avg == null ? "—" : money(avg, s.currency) },
        {
          label: "Est. Uber fees, 30 days",
          value: none || !rated || s.estCommissionMonthCents == null ? "—" : money(s.estCommissionMonthCents, s.currency),
          sub: !rated ? "Add your commission rate" : `at ${s.commissionBps! / 100}%`,
        },
        {
          label: "Est. payout, 30 days",
          value: none || !rated || s.estPayoutMonthCents == null ? "—" : money(s.estPayoutMonthCents, s.currency),
          sub: !rated ? "Add your commission rate" : "estimate",
        },
      ]}
    />
  );
}

function OrdersTable({ store }: { store: Store }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const role = useProject()?.role;
  const canAccept = store.isOrderManager && (role === "full-access" || role === "content-editor");
  const timezone = store.timezone;
  const [cursors, setCursors] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const accept = useMutation(
    trpc.uberEats.acceptOrder.mutationOptions({
      onSuccess: () => {
        toast.success("Order accepted.");
        void queryClient.invalidateQueries({ queryKey: trpc.uberEats.pathKey() });
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't accept the order.")),
    })
  );
  const cursor = cursors.at(-1);
  const list = useQuery({
    ...trpc.uberEats.orders.queryOptions({ projectId, cursor }),
    placeholderData: keepPreviousData,
    // Faster while something is cooking; Uber sends no webhook for accept / finish.
    refetchInterval: (q) =>
      q.state.data?.items.some((o) => o.state === "CREATED" || o.state === "ACCEPTED") ? 30_000 : 60_000,
  });

  const columns: Column<Order>[] = [
    {
      key: "order",
      header: "Order",
      width: "minmax(120px, 0.8fr)",
      cell: (o) => (
        <div className="flex flex-col gap-0.5 py-3">
          <span className="font-medium text-ink">#{o.displayId}</span>
          <span className="text-[13px] text-dim">{o.eaterFirstName ?? "Customer"}</span>
        </div>
      ),
    },
    {
      key: "placed",
      header: "Placed",
      width: "minmax(140px, 1fr)",
      cell: (o) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-ink">{format(parseISO(o.placedAt), "MMM d")}, {localTime(o.placedAt, timezone)}</span>
          <span className="text-[13px] text-dim">{TYPE_LABELS[o.type]}</span>
        </div>
      ),
    },
    {
      key: "items",
      header: "Items",
      width: "minmax(200px, 2fr)",
      cell: (o) => (
        <span className="line-clamp-2 text-ink">
          {o.items.length ? o.items.map((i) => `${i.quantity}× ${i.title}`).join(", ") : "—"}
        </span>
      ),
    },
    {
      key: "total",
      header: "Total",
      width: "100px",
      align: "end",
      cell: (o) => <span className="font-medium text-ink">{money(o.totalCents, o.currency)}</span>,
    },
    {
      key: "state",
      header: "Status",
      width: canAccept ? "170px" : "120px",
      align: "end",
      cell: (o) =>
        canAccept && o.state === "CREATED" ? (
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
          <Badge tone={STATE_LABELS[o.state].tone}>{STATE_LABELS[o.state].label}</Badge>
        ),
    },
  ];

  return (
    <Card>
      <CardHeader title="Orders" divided action={<span className="text-[13px] text-dim">Click an order for details, courier and receipt</span>} />
      {list.isPending ? (
        <div className="p-6">
          <Skeleton className="h-[180px] rounded-card" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={list.data?.items ?? []}
          rowKey={(o) => o.id}
          minWidth={720}
          onRowClick={(o) => setOpenId(o.id)}
          empty={
            <EmptyState
              icon={<UtensilsCrossed className="size-5" />}
              title="No orders yet"
              text="New Uber Eats orders show up here within a minute of being placed."
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
      <OrderDialog orderId={openId} timezone={timezone} canAccept={canAccept} onClose={() => setOpenId(null)} />
    </Card>
  );
}
