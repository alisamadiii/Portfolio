"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import {
  commissionFor,
  formatCents,
  WEBSITE_PRICE_PRESETS,
} from "@workspace/trpc/lib/partners-shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import { Button } from "@/components/ds/ui/button";
import { Field, Input, Select } from "@/components/ds/ui/field";
import { handleCmsError } from "@/lib/trpc-errors";

// "699" / "$1,199" -> cents, or null
const toCents = (v: string) => {
  const n = Number(v.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
};

export type ProjectReferral = {
  partnerId: string;
  partnerName: string;
  priceCents: number | null;
};

/**
 * Admin only: which partner referred this project, and the website price the
 * client pays (the partner earns 40% of it once the client pays).
 */
export function ReferralDialog({
  project,
  current,
  onOpenChange,
}: {
  project: { projectId: string; name: string } | null;
  current: ProjectReferral | null;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const partners = useQuery(trpc.partners.approvedPartners.queryOptions(undefined, { enabled: !!project }));
  const [partnerId, setPartnerId] = useState(current?.partnerId ?? "");
  const [price, setPrice] = useState(current?.priceCents ? String(current.priceCents / 100) : "699");
  const cents = toCents(price);

  const save = useMutation(
    trpc.partners.setProjectReferral.mutationOptions({
      onSuccess: () => {
        toast.success("Referral saved.");
        void queryClient.invalidateQueries({ queryKey: trpc.partners.projectReferrals.queryKey() });
        onOpenChange(false);
      },
      onError: (e) => toast.error(handleCmsError(e, "Couldn't save the referral.")),
    })
  );

  return (
    <Dialog open={!!project} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{current ? "Change referral" : "Set referral"}</DialogTitle>
          <DialogDescription>
            Which partner sent you {project?.name}. It shows in their Partner Program page.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!project || !partnerId || !cents) return;
            save.mutate({ projectId: project.projectId, partnerId, priceCents: cents });
          }}
        >
          <Field label="Partner">
            <Select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} required>
              <option value="" disabled>
                {partners.isPending ? "Loading partners…" : "Choose a partner"}
              </option>
              {partners.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                  {p.code ? ` · ${p.code}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          {partners.data?.length === 0 && (
            <p className="-mt-2 text-[13px] text-dim">No approved partners yet. Approve one in admin first.</p>
          )}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">Website price</span>
            <div className="flex flex-wrap items-center gap-2">
              {WEBSITE_PRICE_PRESETS.map((p) => (
                <Button
                  key={p}
                  type="button"
                  size="sm"
                  variant={cents === p ? "dark" : "outline"}
                  onClick={() => setPrice(String(p / 100))}
                >
                  {formatCents(p)}
                </Button>
              ))}
              <Input
                aria-label="Custom price in dollars"
                inputMode="decimal"
                placeholder="Custom"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-8 w-28"
              />
            </div>
            <span className="text-[13px] text-dim">
              {cents
                ? `What the client pays for the website. Partner earns 40%: ${formatCents(commissionFor(cents))}, after the client pays.`
                : "Enter what the client pays for the website."}
            </span>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!partnerId || !cents || save.isPending}>
              Save referral
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
