"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import {
  CLIENT_PAYMENT_LABELS,
  commissionFor,
  formatCents,
  RECEIPT_MAX_BYTES,
  RECEIPT_TYPES,
  type ReceiptType,
  WEBSITE_PRICE_PRESETS,
} from "@workspace/trpc/lib/partners-shared";

export type Referral = RouterOutputs["partners"]["get"]["referrals"][number];
type PaymentMethod = keyof typeof CLIENT_PAYMENT_LABELS;

const STATUSES = [
  { value: "new", label: "New" },
  { value: "talking", label: "Talking" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
] as const;
type Status = (typeof STATUSES)[number]["value"];

const today = () => format(new Date(), "yyyy-MM-dd");
// "699" / "699.00" / "$1,199" -> cents, or null
const toCents = (v: string) => {
  const n = Number(v.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
};
// "2026-11-14" -> local noon, so the date never shifts a day across timezones
const fromDay = (day: string) => new Date(`${day}T12:00:00`);
// File -> base64 (no data: prefix) for the tRPC upload.
const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
const dollars = (cents: number | null | undefined) => (cents ? String(cents / 100) : "");

/** Website price: $699 / $1,199 quick picks or a custom amount, with the 40% preview. */
function PriceField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const cents = toCents(value);
  return (
    <div className="space-y-1.5">
      <Label htmlFor="ref-price">Website price</Label>
      <div className="flex flex-wrap gap-2">
        {WEBSITE_PRICE_PRESETS.map((p) => (
          <Button
            key={p}
            type="button"
            size="sm"
            variant={cents === p ? "default" : "outline"}
            onClick={() => onChange(String(p / 100))}
          >
            {formatCents(p)}
          </Button>
        ))}
        <Input
          id="ref-price"
          inputMode="decimal"
          required
          placeholder="Custom"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn("h-7 w-28", cents && !WEBSITE_PRICE_PRESETS.includes(cents as never) && "ring-ring/50 ring-2")}
        />
      </div>
      <p className="text-muted-foreground text-xs">
        {cents
          ? `What the client pays for the website. Partner earns 40%: ${formatCents(commissionFor(cents))}.`
          : "What the client pays for the website."}
      </p>
    </div>
  );
}

/** Project picker: projects referred by someone else are disabled. */
function ProjectField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const trpc = useTRPC();
  const projects = useQuery(trpc.partners.projects.queryOptions());
  const items = (projects.data ?? []).map((p) => ({
    value: p.projectId,
    label: p.referredBy ? `${p.name} · referred by ${p.referredBy}` : p.name,
  }));
  return (
    <div className="space-y-1.5">
      <Label>Project</Label>
      <Select items={items} value={value || null} onValueChange={(v) => onChange(String(v ?? ""))}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={projects.isPending ? "Loading projects…" : "Choose a Client Hub project"} />
        </SelectTrigger>
        <SelectContent>
          {projects.data?.map((p) => (
            <SelectItem key={p.projectId} value={p.projectId} disabled={!!p.referredBy}>
              {p.name}
              {p.referredBy ? ` · referred by ${p.referredBy}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * add  = pick the project this partner referred + its website price
 * link = turn a form lead into a project
 * edit = status, price, notes
 */
export function ReferralDialog({
  mode,
  partnerId,
  referral,
  onOpenChange,
  onDone,
}: {
  mode: "add" | "link" | "edit";
  partnerId: string;
  referral: Referral | null;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const trpc = useTRPC();
  const [projectId, setProjectId] = useState("");
  const [price, setPrice] = useState(dollars(referral?.priceCents) || "699");
  const [status, setStatus] = useState<Status>(referral?.status ?? "won");
  const [notes, setNotes] = useState(referral?.notes ?? "");
  const cents = toCents(price);

  const done = (message: string) => () => {
    toast.success(message);
    onOpenChange(false);
    onDone();
  };
  const onError = (e: { message: string }) => toast.error(e.message);
  const add = useMutation(trpc.partners.addReferral.mutationOptions({ onSuccess: done("Referral added."), onError }));
  const link = useMutation(trpc.partners.linkProject.mutationOptions({ onSuccess: done("Project linked."), onError }));
  const update = useMutation(trpc.partners.updateReferral.mutationOptions({ onSuccess: done("Referral saved."), onError }));
  const pending = add.isPending || link.isPending || update.isPending;
  const canSave = !!cents && (mode === "edit" || !!projectId) && !pending;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add referral" : mode === "link" ? "Link project" : `Edit ${referral?.project?.name ?? referral?.businessName}`}
          </DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "The Client Hub project this partner referred. Its name and plan come from the project."
              : mode === "link"
                ? `${referral?.contactName || referral?.businessName} became a client. Pick their project.`
                : "Status, price and private notes."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSave || !cents) return;
            if (mode === "add") add.mutate({ partnerId, projectId, priceCents: cents });
            else if (mode === "link" && referral) link.mutate({ referralId: referral.id, projectId, priceCents: cents });
            else if (referral) update.mutate({ referralId: referral.id, status, notes, priceCents: cents });
          }}
        >
          {mode !== "edit" && <ProjectField value={projectId} onChange={setProjectId} />}
          <PriceField value={price} onChange={setPrice} />
          {mode === "edit" && (
            <>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-notes">Notes</Label>
                <Textarea id="r-notes" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </>
          )}
          <DialogFooter>
            <Button type="submit" disabled={!canSave}>
              {mode === "add" ? "Add referral" : mode === "link" ? "Link project" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The referred client paid: amount (defaults to the price), date, method. */
export function ClientPaidDialog({
  referral,
  onOpenChange,
  onDone,
}: {
  referral: Referral | null;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const trpc = useTRPC();
  const [amount, setAmount] = useState(dollars(referral?.priceCents) || "699");
  const [commission, setCommission] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("stripe");
  const [day, setDay] = useState(today);
  const cents = toCents(amount);
  const suggested = cents ? commissionFor(cents) : null;

  const mark = useMutation(
    trpc.partners.markClientPaid.mutationOptions({
      onSuccess: () => {
        toast.success("Marked as paying.");
        onOpenChange(false);
        onDone();
      },
      onError: (e) => toast.error(e.message),
    })
  );

  return (
    <Dialog open={!!referral} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-sm">
        <DialogHeader>
          <DialogTitle>Client paid</DialogTitle>
          <DialogDescription>
            {referral?.project?.name ?? referral?.businessName} paid for its website. The partner earns 40% of this
            first payment.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!referral || !cents) return;
            const commissionCents = commission.trim() ? toCents(commission) : null;
            mark.mutate({
              referralId: referral.id,
              amountCents: cents,
              ...(commissionCents ? { commissionCents } : {}),
              paidAt: fromDay(day),
              method,
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="cp-amount">Amount the client paid ($)</Label>
            <Input id="cp-amount" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Paid with</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CLIENT_PAYMENT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-date">Paid on</Label>
            <Input id="cp-date" type="date" required value={day} onChange={(e) => setDay(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-commission">Partner commission ($)</Label>
            <Input
              id="cp-commission"
              inputMode="decimal"
              placeholder={suggested ? `${(suggested / 100).toFixed(2)} (40%)` : "40%"}
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Leave empty for 40%{suggested ? `: ${formatCents(suggested)}` : ""}.
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!cents || mark.isPending}>
              Mark as paying
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Ali sent the partner their commission. */
export function PartnerPaidDialog({
  referral,
  payoutMethod,
  onOpenChange,
  onDone,
}: {
  referral: Referral | null;
  payoutMethod: string | null;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const trpc = useTRPC();
  const [reference, setReference] = useState("");
  const [day, setDay] = useState(today);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  const pickReceipt = (file: File | undefined) => {
    setReceipt(null);
    if (!file) return setReceiptError(null);
    if (!(RECEIPT_TYPES as readonly string[]).includes(file.type)) {
      return setReceiptError("Use a PNG, JPG, WebP, HEIC or PDF file.");
    }
    if (file.size > RECEIPT_MAX_BYTES) return setReceiptError("The receipt must be 10 MB or smaller.");
    setReceiptError(null);
    setReceipt(file);
  };

  const mark = useMutation(
    trpc.partners.markPartnerPaid.mutationOptions({
      onSuccess: () => {
        toast.success("Payout recorded.");
        onOpenChange(false);
        onDone();
      },
      onError: (e) => toast.error(e.message),
    })
  );

  return (
    <Dialog open={!!referral} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-sm">
        <DialogHeader>
          <DialogTitle>Partner paid</DialogTitle>
          <DialogDescription>
            You sent {formatCents(referral?.commissionCents ?? 0)} for {referral?.project?.name ?? referral?.businessName}.
            {payoutMethod ? ` Payout method: ${payoutMethod}.` : ""}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!referral || !receipt) return;
            setReading(true);
            try {
              const data = await toBase64(receipt);
              mark.mutate({
                referralId: referral.id,
                paidAt: fromDay(day),
                reference,
                receipt: { name: receipt.name, type: receipt.type as ReceiptType, data },
              });
            } catch {
              toast.error("Couldn't read that file. Try again.");
            } finally {
              setReading(false);
            }
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="pp-ref">Reference</Label>
            <Input
              id="pp-ref"
              maxLength={200}
              placeholder="Zelle confirmation, Cash App id…"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pp-date">Paid on</Label>
            <Input id="pp-date" type="date" required value={day} onChange={(e) => setDay(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pp-receipt">Receipt</Label>
            <Input
              id="pp-receipt"
              type="file"
              required
              accept={RECEIPT_TYPES.join(",")}
              aria-invalid={!!receiptError}
              onChange={(e) => pickReceipt(e.target.files?.[0])}
            />
            <p className={cn("text-xs", receiptError ? "text-destructive" : "text-muted-foreground")}>
              {receiptError ?? "Required. Screenshot or PDF of the payment, up to 10 MB. Stored privately."}
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!receipt || reading || mark.isPending}>
              Record payout
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
