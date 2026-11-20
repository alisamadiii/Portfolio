"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Ban, ExternalLink, RotateCcw, Truck } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
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

import { Badge } from "@/components/ds/ui/badge";
import { Button } from "@/components/ds/ui/button";
import { Field, Input, Select } from "@/components/ds/ui/field";
import { localTime, money } from "@/components/uber-eats/format";
import { useProjectId } from "@/hooks/use-repo";
import { handleCmsError } from "@/lib/trpc-errors";

import { financialLabel, orderBadge } from "./format";

type Detail = RouterOutputs["shopify"]["order"];
type Mode = null | "fulfill" | "cancel" | "refund";

const CANCEL_REASONS = [
  { id: "CUSTOMER", label: "Customer changed their mind" },
  { id: "INVENTORY", label: "Out of stock" },
  { id: "DECLINED", label: "Payment declined" },
  { id: "FRAUD", label: "Fraudulent order" },
  { id: "STAFF", label: "Staff error" },
  { id: "OTHER", label: "Other" },
] as const;
type CancelReason = (typeof CANCEL_REASONS)[number]["id"];

/** One Shopify order, read live: items, money, shipments, and Ship / Cancel / Refund for the owner. */
export function OrderDialog({
  orderId,
  timezone,
  fullAccess,
  onClose,
}: {
  orderId: string | null;
  timezone: string | null;
  /** The owner: may ship, cancel and refund. */
  fullAccess: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!orderId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-[600px]">
        {orderId && <Content orderId={orderId} timezone={timezone} fullAccess={fullAccess} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function Content({
  orderId,
  timezone,
  fullAccess,
  onClose,
}: {
  orderId: string;
  timezone: string | null;
  fullAccess: boolean;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const [mode, setMode] = useState<Mode>(null);
  const detail = useQuery(trpc.shopify.order.queryOptions({ projectId, id: orderId }));

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
  const badge = orderBadge(o);
  const c = o.charges;
  const anyAction = fullAccess && (o.canFulfill || o.canCancel || o.canRefund);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          Order {o.name}
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </DialogTitle>
        <DialogDescription>
          Placed {format(parseISO(o.placedAt), "MMM d, yyyy")}, {localTime(o.placedAt, timezone)} · {financialLabel(o.financialStatus)}
          {o.shippingMethod && ` · ${o.shippingMethod}`}
        </DialogDescription>
      </DialogHeader>

      {anyAction && mode === null && (
        <div className="flex flex-wrap gap-2">
          {o.canFulfill && (
            <Button size="sm" variant="primary" icon={<Truck className="size-4" />} onClick={() => setMode("fulfill")}>
              Mark as shipped
            </Button>
          )}
          {o.canRefund && (
            <Button size="sm" icon={<RotateCcw className="size-4" />} onClick={() => setMode("refund")}>
              Refund
            </Button>
          )}
          {o.canCancel && (
            <Button size="sm" icon={<Ban className="size-4" />} onClick={() => setMode("cancel")}>
              Cancel order
            </Button>
          )}
        </div>
      )}
      {mode === "fulfill" && <FulfillForm order={o} onDone={() => setMode(null)} />}
      {mode === "cancel" && <CancelForm order={o} onDone={() => setMode(null)} />}
      {mode === "refund" && <RefundForm order={o} onDone={() => setMode(null)} />}

      <section className="flex flex-col gap-4 rounded-inner border border-line bg-surface p-4 text-sm">
        <ul className="flex flex-col divide-y divide-divider">
          {o.lines.map((line) => (
            <li key={line.id} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <span className="flex flex-col text-ink">
                <span>
                  <span className="font-semibold">{line.currentQuantity}×</span> {line.title}
                  {line.currentQuantity !== line.quantity && (
                    <span className="text-dim"> (was {line.quantity})</span>
                  )}
                </span>
                {(line.variantTitle || line.sku) && (
                  <span className="text-[13px] text-dim">{[line.variantTitle, line.sku].filter(Boolean).join(" · ")}</span>
                )}
              </span>
              <span className="shrink-0 tabular-nums text-ink">{money(line.totalCents, o.currency)}</span>
            </li>
          ))}
          {o.lines.length === 0 && <li className="py-2 text-dim">No items on this order.</li>}
        </ul>
        <dl className="flex flex-col gap-1 border-t border-divider pt-3 text-[13px]">
          <Row label="Subtotal" value={money(c.subtotalCents, o.currency)} />
          {!!c.discountCents && <Row label="Discounts" value={`−${money(c.discountCents, o.currency)}`} />}
          <Row label="Shipping" value={money(c.shippingCents, o.currency)} />
          <Row label="Tax" value={money(c.taxCents, o.currency)} />
          {!!c.refundedCents && <Row label="Refunded" value={`−${money(c.refundedCents, o.currency)}`} />}
          <Row label="Total" value={money(c.totalCents, o.currency)} strong />
        </dl>
      </section>

      {o.fulfillments.length > 0 && (
        <section className="flex flex-col gap-2 text-sm">
          <span className="text-[13px] font-medium text-dim">Shipments</span>
          <ul className="flex flex-col divide-y divide-divider rounded-inner border border-line">
            {o.fulfillments.map((f, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <span className="text-ink">{format(parseISO(f.createdAt), "MMM d")}</span>
                <span className="text-dim">{f.status.toLowerCase()}</span>
                {f.tracking.map((t, j) =>
                  t.url ? (
                    <a
                      key={j}
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-coral-text hover:underline"
                    >
                      {[t.company, t.number].filter(Boolean).join(" ") || "Tracking"}
                      <ExternalLink className="size-3.5" />
                    </a>
                  ) : (
                    <span key={j} className="text-ink">
                      {[t.company, t.number].filter(Boolean).join(" ")}
                    </span>
                  )
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-[13px] text-dim">Customer details stay in Shopify. Open the order there to contact the customer.</p>
      <DialogFooter>
        <Button onClick={onClose}>Close</Button>
      </DialogFooter>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className={strong ? "font-semibold text-ink" : "text-dim"}>{label}</dt>
      <dd className={strong ? "font-semibold tabular-nums text-ink" : "tabular-nums text-ink"}>{value}</dd>
    </div>
  );
}

function useOrderMutationDone(onDone: () => void, message: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return {
    onSuccess: () => {
      toast.success(message);
      onDone();
      void queryClient.invalidateQueries({ queryKey: trpc.shopify.pathKey() });
    },
  };
}

function FulfillForm({ order, onDone }: { order: Detail; onDone: () => void }) {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const [number, setNumber] = useState("");
  const [company, setCompany] = useState("");
  const [url, setUrl] = useState("");
  const done = useOrderMutationDone(onDone, "Marked as shipped.");
  const fulfill = useMutation(
    trpc.shopify.fulfill.mutationOptions({
      ...done,
      onError: (error) => toast.error(handleCmsError(error, "Shopify didn't take the fulfillment.")),
    })
  );
  return (
    <form
      className="flex flex-col gap-3 rounded-inner border border-line p-4"
      onSubmit={(e) => {
        e.preventDefault();
        fulfill.mutate({
          projectId,
          id: order.id,
          tracking: number.trim()
            ? { number: number.trim(), company: company.trim() || undefined, url: url.trim() || undefined }
            : undefined,
        });
      }}
    >
      <p className="text-sm font-semibold text-ink">Mark every remaining item as shipped</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tracking number" optional>
          <Input value={number} onChange={(e) => setNumber(e.target.value)} maxLength={100} />
        </Field>
        <Field label="Carrier" optional>
          <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="USPS" maxLength={100} />
        </Field>
      </div>
      {number.trim() && (
        <Field label="Tracking link" optional>
          <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" maxLength={500} />
        </Field>
      )}
      <p className="text-[13px] text-dim">The customer isn&apos;t emailed from here.</p>
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="primary" disabled={fulfill.isPending}>
          {fulfill.isPending ? "Saving…" : "Mark as shipped"}
        </Button>
        <Button type="button" size="sm" onClick={onDone} disabled={fulfill.isPending}>
          Back
        </Button>
      </div>
    </form>
  );
}

function CancelForm({ order, onDone }: { order: Detail; onDone: () => void }) {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const [reason, setReason] = useState<CancelReason>("CUSTOMER");
  const [refund, setRefund] = useState(true);
  const [restock, setRestock] = useState(true);
  const done = useOrderMutationDone(onDone, "Cancellation sent to Shopify. It can take a moment to show.");
  const cancel = useMutation(
    trpc.shopify.cancel.mutationOptions({
      ...done,
      onError: (error) => toast.error(handleCmsError(error, "Shopify didn't take the cancellation.")),
    })
  );
  return (
    <form
      className="flex flex-col gap-3 rounded-inner border border-line p-4"
      onSubmit={(e) => {
        e.preventDefault();
        cancel.mutate({ projectId, id: order.id, reason, refund, restock });
      }}
    >
      <p className="text-sm font-semibold text-ink">Cancel order {order.name}?</p>
      <Field label="Reason">
        <Select value={reason} onChange={(e) => setReason(e.target.value as CancelReason)}>
          {CANCEL_REASONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)} className="size-4 accent-coral" />
        Refund the payment ({money(order.charges.totalCents, order.currency)})
      </label>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="size-4 accent-coral" />
        Put the items back in stock
      </label>
      <p className="text-[13px] text-dim">This can&apos;t be undone. The customer isn&apos;t emailed from here.</p>
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="dark" disabled={cancel.isPending}>
          {cancel.isPending ? "Canceling…" : "Cancel order"}
        </Button>
        <Button type="button" size="sm" onClick={onDone} disabled={cancel.isPending}>
          Back
        </Button>
      </div>
    </form>
  );
}

function RefundForm({ order, onDone }: { order: Detail; onDone: () => void }) {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const done = useOrderMutationDone(onDone, "Refund sent to Shopify.");
  const refund = useMutation(
    trpc.shopify.refund.mutationOptions({
      ...done,
      onError: (error) => toast.error(handleCmsError(error, "Shopify didn't take the refund.")),
    })
  );
  return (
    <div className="flex flex-col gap-3 rounded-inner border border-line p-4">
      <p className="text-sm font-semibold text-ink">Refund order {order.name} in full?</p>
      <p className="text-[13px] text-dim">
        Everything still on the order, shipping included, goes back to the original payment method. This can&apos;t be
        undone. For a partial refund, use Shopify. The customer isn&apos;t emailed from here.
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="dark" disabled={refund.isPending} onClick={() => refund.mutate({ projectId, id: order.id })}>
          {refund.isPending ? "Refunding…" : "Refund in full"}
        </Button>
        <Button size="sm" onClick={onDone} disabled={refund.isPending}>
          Back
        </Button>
      </div>
    </div>
  );
}
