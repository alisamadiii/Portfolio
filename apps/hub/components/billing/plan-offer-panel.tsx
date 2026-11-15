"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Lock,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { RequestDialog } from "@workspace/ui/custom/request-dialog";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { formatCurrency } from "@/components/billing/shared";
import { Badge } from "@/components/ds/ui/badge";
import { Button, ButtonAnchor, buttonClass, IconButton } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { Field, Input, Select } from "@/components/ds/ui/field";
import { APPS } from "@/lib/apps";
import { isAdminUser } from "@/lib/authz-shared";

/**
 * Plans are priced per client, so there is no public plan. The client sees
 * the plan an admin prepared for this project (and pays it), or a note to
 * contact us. Admins also get the builder below.
 */
export function PlanOfferPanel({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const offer = useQuery(trpc.cms.subscription.offer.queryOptions({ projectId }));

  if (offer.isPending) return null;
  const data = offer.data;

  if (!data) {
    return (
      <Card className="flex flex-col items-start gap-3 p-6">
        <h2 className="text-base font-semibold">No plan yet</h2>
        <p className="text-sm text-dim">
          Plans are priced for each website, so your plan is set up by our team. If you want to
          see your plan, contact us.
        </p>
        <RequestDialog defaultSubject="Set up a plan for my website">
          <span className={buttonClass("primary")}>Contact us</span>
        </RequestDialog>
      </Card>
    );
  }

  const monthly = data.amount > 0;
  const dueToday = data.amount + (data.setupAmount ?? 0);

  return (
    <Card className="overflow-hidden">
      <div className="grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* What they get */}
        <div className="flex flex-col gap-6 p-6 md:p-8">
          <div className="flex flex-col gap-3">
            <Badge tone="success" icon={<Sparkles className="size-3.5" />} className="w-fit">
              Prepared for you
            </Badge>
            <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">
              {data.name}
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-dim">
              {monthly
                ? "Everything your website needs, set up and looked after by our team. Complete billing and we get started right away."
                : "Your one-time payment is ready. Complete billing and we get started right away."}
            </p>
          </div>

          {monthly && (
            <div className="flex flex-col gap-3">
              <span className="text-sm font-semibold">What&apos;s included</span>
              <ul className="flex flex-col gap-2.5">
                <Included>Edit your website by chatting with AI, then publish in one click</Included>
                <Included>Every app for your site: {APPS.map((app) => app.name).join(", ")}</Included>
                <Included>Changes and requests handled by our team</Included>
              </ul>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {APPS.map((app) => {
                  const Logo = app.logo;
                  const Icon = app.icon;
                  return (
                    <span
                      key={app.id}
                      title={app.name}
                      className="grid size-8 place-items-center rounded-control border border-line bg-surface"
                    >
                      {Logo ? (
                        <Logo className="size-4" />
                      ) : (
                        <Icon className="size-4 text-coral-deep" strokeWidth={1.8} />
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Order summary */}
        <div className="flex flex-col gap-5 border-t border-line bg-canvas p-6 md:border-l md:border-t-0 md:p-8">
          <span className="text-sm font-semibold">Summary</span>
          <ul className="flex flex-col gap-3">
            {data.items.map((line, i) => (
              <li key={i} className="flex items-baseline justify-between gap-4 text-sm">
                <span className="min-w-0">
                  {line.name}
                  {line.quantity > 1 && <span className="text-dim"> × {line.quantity}</span>}
                  <span className="block text-[13px] text-dim">
                    {line.interval === "one_time" ? "One-time" : "Monthly"}
                  </span>
                </span>
                <span className="shrink-0 font-medium tabular-nums">
                  {formatCurrency(line.amount * line.quantity, data.currency)}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-1 border-t border-line pt-4">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-semibold">Due today</span>
              <span className="text-[26px] font-semibold tracking-[-0.02em] tabular-nums">
                {formatCurrency(dueToday, data.currency)}
              </span>
            </div>
            {monthly && (
              <span className="text-right text-[13px] text-dim">
                Then {formatCurrency(data.amount, data.currency)}/month
              </span>
            )}
          </div>

          <ButtonAnchor
            variant="primary"
            href={data.url}
            className="w-full justify-center"
            trailingIcon={<ArrowRight className="size-4" />}
          >
            Complete billing
          </ButtonAnchor>
          <p className="flex items-center justify-center gap-1.5 text-center text-[13px] text-dim">
            <Lock className="size-3.5" />
            Secure checkout with Stripe{monthly ? " · Cancel anytime" : ""}
          </p>
        </div>
      </div>
    </Card>
  );
}

function Included({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-soft text-success-text">
        <Check className="size-3" strokeWidth={2.5} />
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

type Line = {
  key: number;
  kind: "price" | "custom";
  priceId: string;
  name: string;
  interval: "one_time" | "month";
  quantity: string;
  amount: string; // dollars
};

let nextKey = 0;
const blankLine = (kind: Line["kind"]): Line => ({
  key: nextKey++,
  kind,
  priceId: "",
  name: "",
  interval: kind === "custom" ? "month" : "one_time",
  quantity: "1",
  amount: "",
});

const toCents = (dollars: string) => Math.round(Number(dollars) * 100);

/**
 * Admin only: the project's "Payment" button. Build the client's plan from
 * Stripe catalog products and custom items (one-time or monthly), like the
 * client-websites Payment dialog, and get a checkout link that never expires.
 * The link carries projectId/userId/plan metadata, so paying it activates
 * this project.
 */
export function AdminOfferCard({ projectId }: { projectId: string }) {
  const user = useCurrentUser().data?.user ?? null;
  if (!isAdminUser(user)) return null;
  return <AdminOffer projectId={projectId} />;
}

function AdminOffer({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const offer = useQuery(trpc.cms.subscription.offer.queryOptions({ projectId }));
  const [open, setOpen] = useState(false);

  const cancel = useMutation(
    trpc.cms.subscription.cancelOffer.mutationOptions({
      onSuccess: () => {
        toast.success("Payment link canceled. It no longer works.");
        void queryClient.invalidateQueries({
          queryKey: trpc.cms.subscription.offer.queryKey({ projectId }),
        });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("Checkout link copied.");
  };

  return (
    <Card>
      <CardHeader
        title="Client plan"
        action={
          <Button size="sm" variant="primary" onClick={() => setOpen(true)}>
            Payment
          </Button>
        }
      />
      <div className="flex flex-col gap-3 px-6 pb-6">
        <p className="text-sm text-dim">
          Admin only. Build this website&apos;s plan from your products and custom items, then send
          the checkout link. Apps unlock once a monthly item is paid.
        </p>
        {offer.data && (
          <div className="flex flex-col gap-3 rounded-control border border-line bg-canvas p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">{offer.data.name}</span>
              <span className="text-[13px] text-dim">{offerSummary(offer.data)}</span>
            </div>
            <ul className="flex flex-col gap-1 text-[13px] text-dim">
              {offer.data.items.map((line, i) => (
                <li key={i}>
                  {line.quantity > 1 ? `${line.quantity} × ` : ""}
                  {line.name}: {formatCurrency(line.amount, offer.data!.currency)}
                  {line.interval === "one_time" ? " one-time" : "/month"}
                </li>
              ))}
            </ul>
            <code className="break-all text-[13px] text-dim">{offer.data.url}</code>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                icon={<Copy className="size-3.5" />}
                onClick={() => void copy(offer.data!.url)}
              >
                Copy link
              </Button>
              <ButtonAnchor
                size="sm"
                href={offer.data.url}
                target="_blank"
                rel="noreferrer"
                icon={<ExternalLink className="size-3.5" />}
              >
                Open
              </ButtonAnchor>
              <Button
                size="sm"
                variant="ghost"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate({ projectId })}
              >
                Cancel link
              </Button>
            </div>
          </div>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Client plan payment</DialogTitle>
            <DialogDescription>
              The link never expires.{" "}
              {offer.data ? "Creating it replaces the current link." : ""}
            </DialogDescription>
          </DialogHeader>
          <OfferForm projectId={projectId} onCreated={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

const offerSummary = (offer: {
  amount: number;
  setupAmount: number | null;
  currency: string;
}) =>
  [
    offer.amount ? `${formatCurrency(offer.amount, offer.currency)}/month` : null,
    offer.setupAmount ? `${formatCurrency(offer.setupAmount, offer.currency)} one-time` : null,
  ]
    .filter(Boolean)
    .join(" + ");

function OfferForm({ projectId, onCreated }: { projectId: string; onCreated: () => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const catalog = useQuery(trpc.cms.subscription.offerCatalog.queryOptions());
  const prices = (catalog.data ?? []).filter(
    (p) => !p.interval || (p.interval === "month" && p.intervalCount === 1)
  );
  const [name, setName] = useState("");
  const [lines, setLines] = useState<Line[]>([blankLine("price")]);

  const update = (key: number, patch: Partial<Line>) =>
    setLines((all) => all.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  const create = useMutation(
    trpc.cms.subscription.createOffer.mutationOptions({
      onSuccess: () => {
        toast.success("Checkout link ready. Send it to your client.");
        void queryClient.invalidateQueries({
          queryKey: trpc.cms.subscription.offer.queryKey({ projectId }),
        });
        onCreated();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const intervalOf = (line: Line) =>
    line.kind === "custom"
      ? line.interval
      : prices.find((p) => p.id === line.priceId)?.interval
        ? "month"
        : "one_time";
  const lineTotal = (line: Line) =>
    (Number.isFinite(toCents(line.amount)) ? toCents(line.amount) : 0) *
    (Number(line.quantity) || 0);
  const monthly = lines.filter((l) => intervalOf(l) === "month").reduce((s, l) => s + lineTotal(l), 0);
  const today = lines.reduce((s, l) => s + lineTotal(l), 0);

  const problems = [
    !name.trim() && "Name the plan.",
    ...lines.map((line) =>
      line.kind === "price" && !line.priceId
        ? "Pick a product."
        : line.kind === "custom" && !line.name.trim()
          ? "Name each custom item."
          : !(toCents(line.amount) >= 50)
            ? "Each item must be at least $0.50."
            : !(Number(line.quantity) >= 1 && Number(line.quantity) <= 99)
              ? "Quantity is 1 to 99."
              : null
    ),
  ].filter(Boolean) as string[];

  const submit = () =>
    create.mutate({
      projectId,
      name: name.trim(),
      items: lines.map((line) =>
        line.kind === "price"
          ? {
              kind: "price" as const,
              priceId: line.priceId,
              quantity: Number(line.quantity),
              unitAmount: toCents(line.amount),
            }
          : {
              kind: "custom" as const,
              name: line.name.trim(),
              interval: line.interval,
              quantity: Number(line.quantity),
              unitAmount: toCents(line.amount),
            }
      ),
    });

  return (
    <div className="flex flex-col gap-4">
      <Field label="Plan name">
        <Input
          value={name}
          placeholder="Website care for Acme Plumbing"
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold text-ink">Items</span>
        {catalog.isError && <p className="text-[13px] text-danger">{catalog.error.message}</p>}
        {lines.map((line) => (
          <div
            key={line.key}
            className="flex flex-wrap items-center gap-2 rounded-card border border-line p-3"
          >
            <div className="min-w-48 flex-1">
              {line.kind === "price" ? (
                <Select
                  aria-label="Product"
                  value={line.priceId}
                  onChange={(e) => {
                    const next = prices.find((p) => p.id === e.target.value);
                    update(line.key, {
                      priceId: e.target.value,
                      ...(next ? { amount: String(next.unitAmount / 100) } : {}),
                    });
                  }}
                >
                  <option value="">Pick a product</option>
                  {prices.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.productName}
                      {p.nickname ? ` (${p.nickname})` : ""}:{" "}
                      {formatCurrency(p.unitAmount, p.currency)}
                      {p.interval ? "/month" : " one-time"}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  aria-label="Item name"
                  placeholder="Item name, e.g. Website care"
                  value={line.name}
                  onChange={(e) => update(line.key, { name: e.target.value })}
                />
              )}
            </div>
            {line.kind === "custom" && (
              <Select
                aria-label="Billing"
                className="w-28"
                value={line.interval}
                onChange={(e) =>
                  update(line.key, { interval: e.target.value as Line["interval"] })
                }
              >
                <option value="month">Monthly</option>
                <option value="one_time">One-time</option>
              </Select>
            )}
            <Input
              type="number"
              min={1}
              max={99}
              aria-label="Quantity"
              className="w-16"
              value={line.quantity}
              onChange={(e) => update(line.key, { quantity: e.target.value })}
            />
            <Input
              type="number"
              step="0.01"
              min={0.5}
              placeholder="Price"
              aria-label="Price in dollars"
              className="w-28"
              value={line.amount}
              onChange={(e) => update(line.key, { amount: e.target.value })}
            />
            {lines.length > 1 && (
              <IconButton
                aria-label="Remove item"
                onClick={() => setLines((all) => all.filter((l) => l.key !== line.key))}
              >
                <Trash2 className="size-4" />
              </IconButton>
            )}
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="subtle"
            icon={<Plus className="size-4" />}
            onClick={() => setLines((all) => [...all, blankLine("price")])}
          >
            Product
          </Button>
          <Button
            size="sm"
            variant="subtle"
            icon={<Plus className="size-4" />}
            onClick={() => setLines((all) => [...all, blankLine("custom")])}
          >
            Custom item
          </Button>
        </div>
      </div>

      {monthly === 0 && (
        <p className="text-[13px] text-dim">
          No monthly item: the client pays once and apps stay locked.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-sm">
          Due today <span className="font-semibold">{formatCurrency(today)}</span>
          {monthly > 0 && <span className="text-dim">, then {formatCurrency(monthly)}/month</span>}
        </p>
        <Button
          variant="primary"
          disabled={problems.length > 0 || create.isPending}
          title={problems[0]}
          onClick={submit}
        >
          {create.isPending ? "Generating…" : "Generate link"}
        </Button>
      </div>
    </div>
  );
}
