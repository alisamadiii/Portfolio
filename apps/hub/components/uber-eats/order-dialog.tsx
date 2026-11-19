"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Car, Check, Phone, Printer, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import { ACCEPT_WINDOW_MS, DENY_REASONS, type DenyCode } from "@workspace/trpc/lib/uber-eats-constants";
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

import { Badge, type BadgeTone } from "@/components/ds/ui/badge";
import { Button } from "@/components/ds/ui/button";
import { Field, Input, Select } from "@/components/ds/ui/field";
import { LetterTile } from "@/components/ds/ui/misc";
import { useProjectId } from "@/hooks/use-repo";
import { handleCmsError } from "@/lib/trpc-errors";

type Detail = RouterOutputs["uberEats"]["order"];

const STATE_LABELS: Record<Detail["state"], { label: string; tone: BadgeTone }> = {
  CREATED: { label: "New", tone: "coral" },
  ACCEPTED: { label: "In progress", tone: "info" },
  FINISHED: { label: "Completed", tone: "success" },
  CANCELED: { label: "Canceled", tone: "neutral" },
  DENIED: { label: "Denied", tone: "neutral" },
  UNKNOWN: { label: "Unknown", tone: "neutral" },
};

const TYPE_LABELS: Record<Detail["type"], string> = {
  PICK_UP: "Pickup",
  DINE_IN: "Dine in",
  DELIVERY_BY_UBER: "Uber delivery",
  DELIVERY_BY_RESTAURANT: "Own delivery",
  UNKNOWN: "Order",
};

const money = (cents: number | null | undefined, currency: string | null) =>
  cents == null
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(cents / 100);

const localTime = (iso: string, timezone: string | null) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: timezone || undefined }).format(
    parseISO(iso)
  );

const OPEN_STATES: Detail["state"][] = ["CREATED", "ACCEPTED"];

/**
 * One order, read live from Uber when opened: items with their options,
 * instructions, the money, and the courier once Uber assigns one. The
 * receipt part prints on its own (hub-theme.css, data-print-root).
 */
export function OrderDialog({
  orderId,
  timezone,
  canAccept,
  onClose,
}: {
  orderId: string | null;
  timezone: string | null;
  /** The hub is the store's order manager and the viewer may act: show Accept / Deny. */
  canAccept: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!orderId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-[600px]">
        {orderId && <Content orderId={orderId} timezone={timezone} canAccept={canAccept} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function Content({
  orderId,
  timezone,
  canAccept,
  onClose,
}: {
  orderId: string;
  timezone: string | null;
  canAccept: boolean;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const detail = useQuery({
    ...trpc.uberEats.order.queryOptions({ projectId, id: orderId }),
    // The courier card changes while the order is open; Uber has no webhook for it.
    refetchInterval: (q) => (q.state.data && OPEN_STATES.includes(q.state.data.state) ? 20_000 : false),
  });

  if (detail.isPending) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Order</DialogTitle>
          <DialogDescription>Reading the order from Uber Eats…</DialogDescription>
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
  const state = STATE_LABELS[o.state];
  const c = o.charges;
  const showCourier = o.type === "DELIVERY_BY_UBER";

  return (
    <>
      <DialogHeader data-print-hide>
        <DialogTitle className="flex items-center gap-2">
          Order #{o.displayId}
          <Badge tone={state.tone}>{state.label}</Badge>
        </DialogTitle>
        <DialogDescription>
          {TYPE_LABELS[o.type]} · placed {format(parseISO(o.placedAt), "MMM d")}, {localTime(o.placedAt, tz)}
          {o.readyAt && ` · ready by ${localTime(o.readyAt, tz)}`}
          {o.eaterFirstName && ` · for ${o.eaterFirstName}`}
        </DialogDescription>
      </DialogHeader>

      {!o.live && (
        <p className="rounded-inner border border-line bg-canvas px-4 py-3 text-[13px] text-dim" data-print-hide>
          {o.liveError}
        </p>
      )}

      {o.state === "CREATED" && <AcceptBar order={o} canAccept={canAccept} />}

      {showCourier && <CourierCard courier={o.courier} timezone={tz} state={o.state} />}

      {/* ── Receipt: the only thing that prints ── */}
      <section data-print-root className="flex flex-col gap-4 rounded-inner border border-line bg-surface p-4 text-sm">
        <div className="hidden print:block">
          <p className="text-base font-semibold">{o.store.name}</p>
          {o.store.address && <p>{o.store.address}</p>}
          <p className="mt-2">
            Order #{o.displayId} · {TYPE_LABELS[o.type]}
            <br />
            {format(parseISO(o.placedAt), "MMM d, yyyy")}, {localTime(o.placedAt, tz)}
            {o.eaterFirstName && (
              <>
                <br />
                For {o.eaterFirstName}
              </>
            )}
            {o.courier && (
              <>
                <br />
                Courier {o.courier.name}
                {o.courier.plate && ` · ${o.courier.plate}`}
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
              {line.modifiers.map((m, j) => (
                <div key={j} className="pl-6 text-[13px] text-dim">
                  <span className="text-faint">{m.group}:</span>{" "}
                  {m.items
                    .map((it) => `${it.quantity > 1 ? `${it.quantity}× ` : ""}${it.title}${it.priceCents ? ` (+${money(it.priceCents, o.currency)})` : ""}`)
                    .join(", ")}
                </div>
              ))}
              {line.instructions && <div className="pl-6 text-[13px] italic text-ink-3">“{line.instructions}”</div>}
            </li>
          ))}
          {o.lines.length === 0 && <li className="py-2 text-dim">No item details from Uber for this order.</li>}
        </ul>

        {o.specialInstructions && (
          <p className="rounded-inner border border-line bg-canvas px-3 py-2 text-[13px] text-ink">
            <span className="font-semibold">Customer note:</span> {o.specialInstructions}
          </p>
        )}

        <dl className="flex flex-col gap-1 border-t border-divider pt-3 text-[13px]">
          <Row label="Subtotal" value={money(c.subtotalCents, o.currency)} />
          {!!c.promoCents && <Row label="Promotion" value={`−${money(c.promoCents, o.currency)}`} />}
          <Row label="Tax" value={money(c.taxCents, o.currency)} />
          {!!c.serviceFeeCents && <Row label="Fees" value={money(c.serviceFeeCents, o.currency)} />}
          {!!c.deliveryFeeCents && <Row label="Delivery fee" value={money(c.deliveryFeeCents, o.currency)} />}
          {!!c.smallOrderFeeCents && <Row label="Small order fee" value={money(c.smallOrderFeeCents, o.currency)} />}
          {!!c.bagFeeCents && <Row label="Bag fee" value={money(c.bagFeeCents, o.currency)} />}
          {!!c.tipCents && <Row label="Tip" value={money(c.tipCents, o.currency)} />}
          <Row label="Total" value={money(c.totalCents, o.currency)} strong />
          {!!c.cashDueCents && <Row label="Cash due on delivery" value={money(c.cashDueCents, o.currency)} strong />}
        </dl>
        <p className="hidden text-center print:block">Thank you!</p>
      </section>

      <YourSide o={o} />

      <DialogFooter data-print-hide>
        <Button
          size="sm"
          icon={<RefreshCw className={cn("size-4", detail.isFetching && "animate-spin")} />}
          disabled={detail.isFetching}
          onClick={() => void detail.refetch()}
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

/** Minutes left before Uber cancels an unaccepted order; ticks every 10 s. */
function useCountdown(placedAt: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, []);
  const remaining = Math.max(0, parseISO(placedAt).getTime() + ACCEPT_WINDOW_MS - now);
  const m = Math.floor(remaining / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);
  return { remaining, label: `${m}:${String(s).padStart(2, "0")}` };
}

/** New order: the clock, and Accept / Deny when the hub is the order manager. */
function AcceptBar({ order, canAccept }: { order: Detail; canAccept: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const [denying, setDenying] = useState(false);
  const [code, setCode] = useState<DenyCode>("ITEM_AVAILABILITY");
  const [explanation, setExplanation] = useState("");
  const { remaining, label } = useCountdown(order.placedAt);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.uberEats.pathKey() });
  const accept = useMutation(
    trpc.uberEats.acceptOrder.mutationOptions({
      onSuccess: () => {
        toast.success(`Order #${order.displayId} accepted.`);
        void invalidate();
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't accept the order.")),
    })
  );
  const deny = useMutation(
    trpc.uberEats.denyOrder.mutationOptions({
      onSuccess: () => {
        toast.success(`Order #${order.displayId} denied.`);
        setDenying(false);
        void invalidate();
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't deny the order.")),
    })
  );
  const busy = accept.isPending || deny.isPending;

  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-inner border px-4 py-3 text-sm",
        remaining > 0 ? "border-coral bg-coral-soft" : "border-line bg-canvas"
      )}
      data-print-hide
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="font-semibold text-ink">New order</span>
          <span className="text-[13px] text-ink-3">
            {remaining > 0 ? `Uber cancels it in ${label} if nobody accepts.` : "The acceptance window has passed. Check the tablet."}
          </span>
        </div>
        {canAccept ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setDenying((d) => !d)} disabled={busy} icon={<X className="size-4" />}>
              Deny
            </Button>
            <Button size="sm" variant="primary" onClick={() => accept.mutate({ projectId, id: order.id })} disabled={busy} icon={<Check className="size-4" />}>
              {accept.isPending ? "Accepting…" : "Accept order"}
            </Button>
          </div>
        ) : (
          <span className="text-[13px] text-dim">Accept it on your Uber Eats tablet.</span>
        )}
      </div>
      {denying && canAccept && (
        <form
          className="flex flex-col gap-3 border-t border-coral/30 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (explanation.trim()) deny.mutate({ projectId, id: order.id, code, explanation: explanation.trim() });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Why">
              <Select value={code} onChange={(e) => setCode(e.target.value as DenyCode)}>
                {DENY_REASONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Note for Uber" hint="Short, e.g. “Out of tiramisu tonight”.">
              <Input value={explanation} maxLength={300} onChange={(e) => setExplanation(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" onClick={() => setDenying(false)} disabled={busy}>
              Keep it
            </Button>
            <Button type="submit" size="sm" variant="dark" disabled={busy || !explanation.trim()}>
              {deny.isPending ? "Denying…" : "Deny order"}
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

/** The restaurant's side of the money: what Uber reports, plus the owner's-rate estimate. */
function YourSide({ o }: { o: Detail }) {
  const est = o.estimate;
  const rows: { label: string; value: string; strong?: boolean }[] = [];
  if (o.merchantPromoCents) rows.push({ label: "Promotion you funded", value: `−${money(o.merchantPromoCents, o.currency)}` });
  if (o.taxMerchantCents != null) rows.push({ label: "Tax you remit", value: money(o.taxMerchantCents, o.currency) });
  if (o.merchantFeeCents) rows.push({ label: "Fees paid to you", value: money(o.merchantFeeCents, o.currency) });
  if (o.tipCents) rows.push({ label: "Tip", value: money(o.tipCents, o.currency) });
  if (o.uberFeeCents) rows.push({ label: "Uber marketplace fee", value: `−${money(o.uberFeeCents, o.currency)}` });
  if (est) {
    rows.push({ label: "Est. Uber commission", value: `−${money(est.commissionCents, o.currency)}` });
    rows.push({ label: "Est. payout to you", value: money(est.payoutCents, o.currency), strong: true });
  }
  return (
    <section className="flex flex-col gap-2 rounded-inner border border-line bg-sidebar p-4 text-sm" data-print-hide>
      <h3 className="text-sm font-semibold text-ink">Your side</h3>
      <dl className="flex flex-col gap-1 text-[13px]">
        <Row label="Food subtotal" value={money(o.subtotalCents, o.currency)} />
        {rows.map((r) => (
          <Row key={r.label} {...r} />
        ))}
      </dl>
      <p className="text-xs text-faint">
        {est
          ? "Estimate from the commission rate you entered. Exact payouts are in Uber Eats Manager › Payments."
          : "Add your Uber commission rate on the store card to see an estimated payout. Exact payouts are in Uber Eats Manager › Payments."}
      </p>
    </section>
  );
}

function CourierCard({
  courier,
  timezone,
  state,
}: {
  courier: Detail["courier"];
  timezone: string | null;
  state: Detail["state"];
}) {
  const done = state === "FINISHED" || state === "CANCELED" || state === "DENIED";
  return (
    <section className="flex items-center gap-3 rounded-inner border border-line bg-surface p-4 text-sm" data-print-hide>
      {courier ? (
        <>
          {courier.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Uber-hosted courier photo, shown live
            <img
              src={courier.photoUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="size-12 shrink-0 rounded-full border border-line object-cover"
            />
          ) : (
            <LetterTile name={courier.name} size={36} />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-semibold text-ink">
              {courier.name} <span className="font-normal text-dim">· Uber courier</span>
            </span>
            {(courier.vehicle || courier.plate) && (
              <span className="flex items-center gap-1.5 text-[13px] text-ink-3">
                <Car className="size-3.5 shrink-0 text-dim" aria-hidden />
                {courier.vehicle}
                {courier.plate && <span className="rounded border border-line-strong bg-canvas px-1.5 font-mono text-xs text-ink">{courier.plate}</span>}
              </span>
            )}
            <span className="text-[13px] text-dim">
              {courier.stateLabel ?? "Assigned"}
              {courier.etaPickup && !done && ` · pickup around ${localTime(courier.etaPickup, timezone)}`}
            </span>
            {courier.phone && (
              <span className="flex items-center gap-1.5 text-[13px] text-dim">
                <Phone className="size-3.5 shrink-0" aria-hidden />
                <a href={`tel:${courier.phone}`} className="text-coral-text hover:underline">
                  {courier.phone}
                </a>
                {courier.phoneCode && <span>· PIN {courier.phoneCode}</span>}
              </span>
            )}
          </div>
        </>
      ) : (
        <>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-subtle text-dim">
            <Car className="size-4" aria-hidden />
          </span>
          <span className="text-[13px] text-dim">
            {done ? "No courier details for this order." : state === "CREATED" ? "Uber assigns a courier once the order is accepted." : "Uber hasn't assigned a courier yet. This updates on its own."}
          </span>
        </>
      )}
    </section>
  );
}
