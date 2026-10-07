"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import { useTRPC } from "@workspace/trpc/client";

const REASON_LABELS: Record<string, string> = {
  signup: "Free signup credits",
  purchase: "Credit pack purchase",
  refund: "Refund",
  scan: "Scan, leads unlocked",
  unlock: "Leads unlocked",
  adjustment: "Adjustment",
};

export const BillingHistoryDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const trpc = useTRPC();

  const credits = useQuery(trpc.leads.credits.get.queryOptions());
  const portal = useMutation(
    trpc.payments.customerPortal.mutationOptions({
      onSuccess: (data) => {
        if (data?.url) window.location.href = data.url;
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const ledger = credits.data?.ledger ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Billing history</DialogTitle>
          <DialogDescription>
            Your latest credit activity. Invoices and receipts live in the
            Stripe billing portal.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {credits.isLoading ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Loading…
            </p>
          ) : !ledger.length ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No activity yet.
            </p>
          ) : (
            ledger.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 odd:bg-muted/50"
              >
                <div>
                  <p className="text-sm font-medium">
                    {REASON_LABELS[entry.reason] ?? entry.reason}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    entry.delta >= 0 ? "text-emerald-600" : "text-foreground"
                  }`}
                >
                  {entry.delta >= 0 ? "+" : ""}
                  {entry.delta.toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
        <button
          disabled={portal.isPending}
          onClick={() =>
            portal.mutate({ returnUrl: window.location.href })
          }
          className="btn-pill btn-light w-full text-sm"
        >
          {portal.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <ExternalLink />
          )}
          View invoices in Stripe
        </button>
      </DialogContent>
    </Dialog>
  );
};
