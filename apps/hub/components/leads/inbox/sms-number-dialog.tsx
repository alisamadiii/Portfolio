"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import { formatPhone } from "@workspace/trpc/lib/inbox-shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import { useAgency } from "@/components/agency/use-agency";
import { Button } from "@/components/ds/ui/button";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { Input } from "@/components/ds/ui/field";

/** "PONTE VEDRA BEACH" -> "Ponte Vedra Beach" (Telnyx rate centers are upper case). */
const titleCase = (value: string) => value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Admin only: buy this project's texting number on the agency Telnyx account
 * (search by area code, pick one), or release the current one.
 */
export function SmsNumberDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { projectId } = useAgency();
  const status = useQuery(trpc.agency.sms.status.queryOptions({ projectId }));
  const [areaCode, setAreaCode] = useState("");
  const [searched, setSearched] = useState<string | null>(null);
  const [confirmBuy, setConfirmBuy] = useState<string | null>(null);
  const [confirmRelease, setConfirmRelease] = useState(false);

  const numbers = useQuery(
    trpc.agency.sms.searchNumbers.queryOptions(
      { projectId, ...(searched && { areaCode: searched }) },
      { enabled: open && searched !== null && !status.data?.number, retry: false }
    )
  );

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.agency.sms.pathKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.agency.inbox.thread.pathKey() });
  };

  const buy = useMutation(
    trpc.agency.sms.buyNumber.mutationOptions({
      onSuccess: ({ number }) => {
        toast.success(`${formatPhone(number)} is now this project's texting number.`);
        refresh();
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message),
    })
  );
  const release = useMutation(
    trpc.agency.sms.releaseNumber.mutationOptions({
      onSuccess: () => {
        toast.success("Number released.");
        refresh();
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const current = status.data?.number;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Texting number</DialogTitle>
          <DialogDescription>
            Bought on the agency Telnyx account. US carriers only deliver texts once the business
            has a 10DLC brand and campaign registered in Telnyx.
          </DialogDescription>
        </DialogHeader>

        {!status.data?.configured ? (
          <p className="text-[13px] text-dim">Set TELNYX_API_KEY on the api service first.</p>
        ) : current ? (
          <div className="flex items-center justify-between gap-3 rounded-inner border border-line px-4 py-3">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-ink">{formatPhone(current)}</span>
              <span className="text-[13px] text-dim">Texts and replies use this number.</span>
            </div>
            <Button size="sm" disabled={release.isPending} onClick={() => setConfirmRelease(true)}>
              Release
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setSearched(areaCode.trim());
              }}
            >
              <Input
                autoFocus
                inputMode="numeric"
                maxLength={3}
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, ""))}
                placeholder="Area code, e.g. 904"
                aria-label="Area code"
              />
              <Button type="submit" variant="dark" disabled={areaCode.length !== 0 && areaCode.length !== 3}>
                Search
              </Button>
            </form>

            {numbers.error && <p className="text-[13px] text-danger">{numbers.error.message}</p>}
            {numbers.isFetching && <p className="text-[13px] text-dim">Searching…</p>}
            {numbers.data && numbers.data.length === 0 && (
              <p className="text-[13px] text-dim">No numbers with texting in that area code. Try a nearby one.</p>
            )}
            {numbers.data && numbers.data.length > 0 && (
              <ul className="flex max-h-[320px] flex-col overflow-y-auto rounded-inner border border-line">
                {numbers.data.map((n) => (
                  <li
                    key={n.phoneNumber}
                    className="flex items-center justify-between gap-3 border-b border-divider px-3 py-2 last:border-b-0"
                  >
                    <span className="flex flex-col">
                      <span className="text-sm font-medium text-ink">{formatPhone(n.phoneNumber)}</span>
                      <span className="text-xs text-dim">
                        {[n.locality && titleCase(n.locality), n.region].filter(Boolean).join(", ") || "United States"}
                        {Number(n.monthlyCost) > 0 && ` · $${Number(n.monthlyCost).toFixed(2)}/mo`}
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={buy.isPending}
                      onClick={() => setConfirmBuy(n.phoneNumber)}
                    >
                      Buy
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <ConfirmDialog
          open={confirmBuy !== null}
          onOpenChange={(o) => !o && setConfirmBuy(null)}
          title={`Buy ${formatPhone(confirmBuy)}?`}
          description="Telnyx charges the agency account for this number every month until it's released."
          confirmLabel="Buy number"
          onConfirm={() => confirmBuy && buy.mutate({ projectId, phoneNumber: confirmBuy })}
        />
        <ConfirmDialog
          open={confirmRelease}
          onOpenChange={setConfirmRelease}
          title={`Release ${formatPhone(current)}?`}
          description="The number goes back to Telnyx and can't be recovered. Leads texting it won't reach this project anymore."
          confirmLabel="Release number"
          danger
          onConfirm={() => release.mutate({ projectId })}
        />
      </DialogContent>
    </Dialog>
  );
}
