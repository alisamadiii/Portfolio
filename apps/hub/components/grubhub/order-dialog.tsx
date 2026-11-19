"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Bike, Check, MapPin, Phone, Printer, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import {
  CANCEL_REASONS,
  REJECT_REASONS,
  WAIT_TIME_CHOICES,
  type CancelCode,
  type RejectCode,
  type WaitTimeChoice,
} from "@workspace/trpc/lib/grubhub-constants";
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

import { Badge } from "@/components/ds/ui/badge";
import { Button } from "@/components/ds/ui/button";
import { Field, Input, Select } from "@/components/ds/ui/field";
import { useProjectId } from "@/hooks/use-repo";
import { handleCmsError } from "@/lib/trpc-errors";

import { confirmCountdown, FULFILLMENT_LABELS, localTime, money, STATUS_META } from "./format";

type Detail = RouterOutputs["grubhub"]["order"];

const OPEN_STATES: Detail["status"][] = ["ANTICIPATED", "RESTAURANT_CONFIRMABLE", "CONFIRMED", "PICKUP_READY", "OUT_FOR_DELIVERY"];

/**
 * One Grubhub order from the payload Grubhub sent: items with their options,
 * the customer, the money, and the buttons the order's state allows. The
 * receipt part prints on its own (hub-theme.css, data-print-root).
 */
export function OrderDialog({
  orderId,
  timezone,
  canAct,
  fullAccess,
  onClose,
}: {
  orderId: string | null;
  timezone: string | null;
  /** The store is live and the viewer may act on orders: show Confirm / Reject / Ready. */
  canAct: boolean;
  /** The owner: may ask Grubhub Care to cancel a confirmed order. */
  fullAccess: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!orderId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-[600px]">
        {orderId && <Content orderId={orderId} timezone={timezone} canAct={canAct} fullAccess={fullAccess} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function Content({
  orderId,
  timezone,
  canAct,
  fullAccess,
  onClose,
}: {
  orderId: string;
  timezone: string | null;
  canAct: boolean;
  fullAccess: boolean;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const [refreshing, setRefreshing] = useState(false);
  const detail = useQuery({
    ...trpc.grubhub.order.queryOptions({ projectId, id: orderId, refresh: refreshing || undefined }),
    // Webhooks move the order along while it's open; poll in between.
    refetchInterval: (q) => (q.state.data && OPEN_STATES.includes(q.state.data.status) ? 20_000 : false),
  });

  if (detail.isPending) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Order</DialogTitle>
          <DialogDescription>Loading the order…</DialogDescription>
        </DialogHeader>
        <Skeleton className="h-[260px] rounded-card" />
      </>
    );
  }
  if (detail.isError) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Order</DialogTitle>
          <DialogDescription>{handleCmsError(detail.error, "Couldn't load this order.")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </>
    );
  }

  const o = detail.data;
  const tz = o.store.timezone ?? timezone;
  const meta = STATUS_META[o.status];
  const c = o.charges;
  const anyAction = Object.values(o.actions).some(Boolean);

  return (
    <>
      <DialogHeader data-print-hide>
        <DialogTitle className="flex items-center gap-2">
          Order #{o.orderNumber}
          <Badge tone={meta.tone}>{meta.label}</Badge>
          {o.isTest && <Badge tone="neutral">Test</Badge>}
        </DialogTitle>
        <DialogDescription>
          {FULFILLMENT_LABELS[o.fulfillment]} · placed {format(parseISO(o.placedAt), "MMM d")}, {localTime(o.placedAt, tz)}
          {o.scheduling === "FUTURE" && o.whenFor && ` · scheduled for ${format(parseISO(o.whenFor), "MMM d")}, ${localTime(o.whenFor, tz)}`}
          {o.customer.name && ` · for ${o.customer.name}`}
        </DialogDescription>
      </DialogHeader>

      {o.liveError && (
        <p className="rounded-inner border border-line bg-canvas px-4 py-3 text-[13px] text-dim" data-print-hide>
          {o.liveError}
        </p>
      )}

      {(anyAction || o.status === "RESTAURANT_CONFIRMABLE" || o.cancelRequestStatus) && (
        <ActionBar order={o} canAct={canAct} fullAccess={fullAccess} />
      )}

      <CustomerCard order={o} timezone={tz} />

      {/* ── Receipt: the only thing that prints ── */}
      <section data-print-root className="flex flex-col gap-4 rounded-inner border border-line bg-surface p-4 text-sm">
        <div className="hidden print:block">
          <p className="text-base font-semibold">{o.store.name}</p>
          {o.store.address && <p>{o.store.address}</p>}
          <p className="mt-2">
            Grubhub order #{o.orderNumber} · {FULFILLMENT_LABELS[o.fulfillment]}
            <br />
            {format(parseISO(o.placedAt), "MMM d, yyyy")}, {localTime(o.placedAt, tz)}
            {o.customer.name && (
              <>
                <br />
                For {o.customer.name}
              </>
            )}
            {o.waitTimeMinutes && (
              <>
                <br />
                Ready in {o.waitTimeMinutes} min
              </>
            )}
          </p>
        </div>

        <ul className="flex flex-col divide-y divide-divider">
          {o.lines.map((line, i) => (
            <li key={i} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <span className="text-ink">
                  <span className="font-semibold">{line.quantity}×</span> {line.title}
                </span>
                <span className="shrink-0 tabular-nums text-ink">{money(line.totalCents, o.currency)}</span>
              </div>
              {line.options.map((g, j) => (
                <div key={j} className="pl-6 text-[13px] text-dim">
                  <span className="text-faint">{g.group}:</span>{" "}
                  {g.items
                    .map((it) => `${it.quantity > 1 ? `${it.quantity}× ` : ""}${it.title}${it.priceCents ? ` (+${money(it.priceCents, o.currency)})` : ""}`)
                    .join(", ")}
                </div>
              ))}
              {line.instructions && <div className="pl-6 text-[13px] italic text-ink-3">“{line.instructions}”</div>}
            </li>
          ))}
          {o.lines.length === 0 && <li className="py-2 text-dim">No item details from Grubhub for this order.</li>}
        </ul>

        <dl className="flex flex-col gap-1 border-t border-divider pt-3 text-[13px]">
          <Row label="Subtotal" value={money(c.merchantSubtotalCents, o.currency)} />
          {c.coupons.map((cp) => (
            <Row key={cp.text} label={cp.text} value={`−${money(cp.amountCents, o.currency)}`} />
          ))}
          <Row label="Tax" value={money(c.taxCents, o.currency)} />
          {!!c.feesCents && <Row label="Fees" value={money(c.feesCents, o.currency)} />}
          {!!c.deliveryFeeCents && <Row label="Delivery fee" value={money(c.deliveryFeeCents, o.currency)} />}
          {!!c.tipCents && <Row label="Tip" value={money(c.tipCents, o.currency)} />}
          <Row label="Total paid by customer" value={money(c.dinerGrandTotalCents ?? c.grandTotalCents, o.currency)} strong />
          <Row label="Grubhub pays you (before commission)" value={money(c.merchantTotalCents, o.currency)} strong />
        </dl>
        <p className="hidden text-center print:block">Thank you!</p>
      </section>

      <p className="text-xs text-faint" data-print-hide>
        &ldquo;Grubhub pays you&rdquo; is Grubhub&apos;s order value before its commission. Exact payouts are in Grubhub for Restaurants
        under Financials.
      </p>

      <DialogFooter data-print-hide>
        <Button
          size="sm"
          icon={<RefreshCw className={cn("size-4", detail.isFetching && "animate-spin")} />}
          disabled={detail.isFetching}
          onClick={() => {
            setRefreshing(true);
            void detail.refetch().finally(() => setRefreshing(false));
          }}
        >
          Refresh
        </Button>
        <Button size="sm" icon={<Printer className="size-4" />} onClick={() => window.print()}>
          Print receipt
        </Button>
        <Button size="sm" variant="dark" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </>
  );
}

/** Minutes left before Grubhub cancels an unconfirmed order; ticks every 5 s. */
export function useCountdown(placedAt: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(t);
  }, []);
  return confirmCountdown(placedAt, now);
}

/** The buttons the order's state allows, with the clock on a new order. */
function ActionBar({ order, canAct, fullAccess }: { order: Detail; canAct: boolean; fullAccess: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const [rejecting, setRejecting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [waitTime, setWaitTime] = useState<WaitTimeChoice>(20);
  const [rejectCode, setRejectCode] = useState<RejectCode>("MENU_ITEM_NOT_FOUND");
  const [rejectMessage, setRejectMessage] = useState("");
  const [cancelCode, setCancelCode] = useState<CancelCode>("OUT_OF_ITEM");
  const [cancelReason, setCancelReason] = useState("");
  const { remaining, label } = useCountdown(order.placedAt);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.grubhub.pathKey() });
  const done = (message: string) => () => {
    toast.success(message);
    setRejecting(false);
    setCancelling(false);
    void invalidate();
  };
  const fail = (fallback: string) => (error: unknown) => toast.error(handleCmsError(error, fallback));

  const confirm = useMutation(trpc.grubhub.confirmOrder.mutationOptions({ onSuccess: done(`Order #${order.orderNumber} confirmed.`), onError: fail("Couldn't confirm the order.") }));
  const reject = useMutation(trpc.grubhub.rejectOrder.mutationOptions({ onSuccess: done(`Order #${order.orderNumber} rejected.`), onError: fail("Couldn't reject the order.") }));
  const ready = useMutation(trpc.grubhub.markReady.mutationOptions({ onSuccess: done("Marked ready for pickup."), onError: fail("Couldn't update the order.") }));
  const out = useMutation(trpc.grubhub.markOutForDelivery.mutationOptions({ onSuccess: done("Marked out for delivery."), onError: fail("Couldn't update the order.") }));
  const delivered = useMutation(trpc.grubhub.markFulfilled.mutationOptions({ onSuccess: done("Marked delivered."), onError: fail("Couldn't update the order.") }));
  const requestCancel = useMutation(
    trpc.grubhub.requestCancel.mutationOptions({ onSuccess: done("Cancellation requested. Grubhub Care reviews it."), onError: fail("Couldn't send the cancellation request.") })
  );
  const checkCancel = useMutation(
    trpc.grubhub.cancelRequests.mutationOptions({
      onSuccess: (r) => {
        toast.success(r.status ? `Grubhub Care says: ${r.status.toLowerCase()}.` : "No answer from Grubhub Care yet.");
        void invalidate();
      },
      onError: fail("Couldn't check the request."),
    })
  );
  const busy = confirm.isPending || reject.isPending || ready.isPending || out.isPending || delivered.isPending || requestCancel.isPending;
  const a = order.actions;
  const isNew = order.status === "RESTAURANT_CONFIRMABLE";

  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-inner border px-4 py-3 text-sm",
        isNew && remaining > 0 ? "border-coral bg-coral-soft" : "border-line bg-canvas"
      )}
      data-print-hide
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="font-semibold text-ink">
            {isNew ? "New order" : order.status === "CONFIRMED" ? "In the kitchen" : order.status === "PICKUP_READY" ? "Ready" : order.status === "OUT_FOR_DELIVERY" ? "On the way" : STATUS_META[order.status].label}
          </span>
          <span className="text-[13px] text-ink-3">
            {isNew
              ? remaining > 0
                ? `Grubhub cancels it in ${label} if nobody confirms.`
                : "The confirmation window has passed. Grubhub may have cancelled it."
              : order.cancelRequestStatus
                ? `Cancellation ${order.cancelRequestStatus.toLowerCase()}. Grubhub Care reviews requests by hand.`
                : order.waitTimeMinutes
                  ? `You said ready in ${order.waitTimeMinutes} min.`
                  : ""}
          </span>
        </div>
        {canAct ? (
          <div className="flex flex-wrap items-end gap-2">
            {a.confirm && (
              <>
                <Field label="Ready in" className="w-[120px]">
                  <Select value={waitTime} onChange={(e) => setWaitTime(Number(e.target.value) as WaitTimeChoice)}>
                    {WAIT_TIME_CHOICES.map((n) => (
                      <option key={n} value={n}>
                        {n} min
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button size="sm" onClick={() => setRejecting((r) => !r)} disabled={busy} icon={<X className="size-4" />}>
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => confirm.mutate({ projectId, id: order.id, waitTimeMinutes: waitTime })}
                  disabled={busy}
                  icon={<Check className="size-4" />}
                >
                  {confirm.isPending ? "Confirming…" : "Confirm order"}
                </Button>
              </>
            )}
            {a.ready && (
              <Button size="sm" variant="primary" disabled={busy} icon={<Check className="size-4" />} onClick={() => ready.mutate({ projectId, id: order.id })}>
                {ready.isPending ? "Saving…" : "Ready for pickup"}
              </Button>
            )}
            {a.outForDelivery && (
              <Button size="sm" variant="primary" disabled={busy} icon={<Bike className="size-4" />} onClick={() => out.mutate({ projectId, id: order.id })}>
                {out.isPending ? "Saving…" : "Out for delivery"}
              </Button>
            )}
            {a.fulfilled && (
              <Button size="sm" variant="primary" disabled={busy} icon={<Check className="size-4" />} onClick={() => delivered.mutate({ projectId, id: order.id })}>
                {delivered.isPending ? "Saving…" : "Delivered"}
              </Button>
            )}
            {a.requestCancel && fullAccess && !order.cancelRequestStatus && (
              <Button size="sm" disabled={busy} onClick={() => setCancelling((c) => !c)}>
                Request cancellation
              </Button>
            )}
            {order.cancelRequestStatus && (
              <Button size="sm" disabled={checkCancel.isPending} onClick={() => checkCancel.mutate({ projectId, id: order.id })}>
                {checkCancel.isPending ? "Checking…" : "Check status"}
              </Button>
            )}
          </div>
        ) : (
          isNew && <span className="text-[13px] text-dim">Confirm it on your Grubhub tablet.</span>
        )}
      </div>
      {rejecting && canAct && a.reject && (
        <form
          className="flex flex-col gap-3 border-t border-coral/30 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (rejectMessage.trim()) reject.mutate({ projectId, id: order.id, code: rejectCode, message: rejectMessage.trim() });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Why">
              <Select value={rejectCode} onChange={(e) => setRejectCode(e.target.value as RejectCode)}>
                {REJECT_REASONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Note for Grubhub" hint="Short, e.g. “Out of basil tonight”.">
              <Input value={rejectMessage} maxLength={300} onChange={(e) => setRejectMessage(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" onClick={() => setRejecting(false)} disabled={busy}>
              Keep it
            </Button>
            <Button type="submit" size="sm" variant="dark" disabled={busy || !rejectMessage.trim()}>
              {reject.isPending ? "Rejecting…" : "Reject order"}
            </Button>
          </div>
        </form>
      )}
      {cancelling && canAct && fullAccess && a.requestCancel && (
        <form
          className="flex flex-col gap-3 border-t border-line pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            requestCancel.mutate({ projectId, id: order.id, code: cancelCode, reason: cancelReason.trim() });
          }}
        >
          <p className="text-[13px] text-dim">
            A Grubhub Care agent reviews the request; it isn&apos;t instant. If approved, the customer is refunded in full.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Why">
              <Select value={cancelCode} onChange={(e) => setCancelCode(e.target.value as CancelCode)}>
                {CANCEL_REASONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Details" optional>
              <Input value={cancelReason} maxLength={300} onChange={(e) => setCancelReason(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" onClick={() => setCancelling(false)} disabled={busy}>
              Never mind
            </Button>
            <Button type="submit" size="sm" variant="dark" disabled={busy || (cancelCode === "OTHER" && !cancelReason.trim())}>
              {requestCancel.isPending ? "Sending…" : "Send to Grubhub Care"}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", strong && "mt-1 border-t border-divider pt-2 text-sm font-semibold text-ink")}>
      <dt className={cn(!strong && "text-dim")}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

/** Who the order is for and how it leaves the kitchen. Not printed. */
function CustomerCard({ order: o, timezone }: { order: Detail; timezone: string | null }) {
  const d = o.delivery;
  return (
    <section className="flex flex-col gap-2 rounded-inner border border-line bg-surface p-4 text-sm" data-print-hide>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-semibold text-ink">{o.customer.name ?? "Customer"}</span>
        {o.customer.phone && (
          <span className="flex items-center gap-1.5 text-[13px] text-dim">
            <Phone className="size-3.5 shrink-0" aria-hidden />
            <a href={`tel:${o.customer.phone}`} className="text-coral-text hover:underline">
              {o.customer.phone}
            </a>
          </span>
        )}
        <span className="text-[13px] text-dim">{FULFILLMENT_LABELS[o.fulfillment]}</span>
      </div>
      {o.pickup?.instructions && (
        <p className="text-[13px] text-ink">
          <span className="font-semibold">Pickup note:</span> {o.pickup.instructions}
        </p>
      )}
      {o.fulfillment === "GRUBHUB_DELIVERY" && (
        <p className="flex items-center gap-1.5 text-[13px] text-dim">
          <Bike className="size-3.5 shrink-0" aria-hidden />
          A Grubhub driver picks this up
          {d?.estimatedDriverPickupAt && ` around ${localTime(d.estimatedDriverPickupAt, timezone)}`}.
        </p>
      )}
      {o.fulfillment === "SELF_DELIVERY" && d && (
        <div className="flex flex-col gap-1 text-[13px]">
          {d.address && (
            <span className="flex items-start gap-1.5 text-ink">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-dim" aria-hidden />
              {d.address}
            </span>
          )}
          {d.instruction && (
            <span className="text-ink">
              <span className="font-semibold">Delivery note:</span> {d.instruction}
            </span>
          )}
          {d.estimatedDeliveryAt && <span className="text-dim">Deliver by {localTime(d.estimatedDeliveryAt, timezone)}</span>}
        </div>
      )}
      {o.rejectReasonCode && (
        <p className="text-[13px] text-dim">
          Rejected: {REJECT_REASONS.find((r) => r.code === o.rejectReasonCode)?.label ?? o.rejectReasonCode}
          {o.rejectMessage && ` (“${o.rejectMessage}”)`}
        </p>
      )}
    </section>
  );
}
