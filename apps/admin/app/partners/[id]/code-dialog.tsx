"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { Check, Loader, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
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

import { useTRPC } from "@workspace/trpc/client";
import { normalizePartnerCode, partnerCodeError } from "@workspace/trpc/lib/partners-shared";

/**
 * Pick the partner's referral code by hand. "approve" approves + emails it;
 * "change" replaces an approved partner's code. Availability is checked
 * case-insensitively as you type, and again on the server when saving.
 */
export function CodeDialog({
  mode,
  partnerId,
  partnerName,
  currentCode,
  onOpenChange,
  onDone,
}: {
  mode: "approve" | "change" | null;
  partnerId: string;
  partnerName: string;
  currentCode: string | null;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const trpc = useTRPC();
  const [value, setValue] = useState(mode === "change" ? (currentCode ?? "") : "");
  const [notify, setNotify] = useState(true);
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 250);
    return () => clearTimeout(t);
  }, [value]);

  const formatError = value.trim() ? partnerCodeError(value) : null;
  const normalized = normalizePartnerCode(value);
  const unchanged = mode === "change" && normalized === currentCode;
  const check = useQuery(
    trpc.partners.codeAvailable.queryOptions(
      { id: partnerId, code: debounced },
      {
        enabled: !!mode && !!debounced.trim() && !partnerCodeError(debounced),
        placeholderData: keepPreviousData,
        staleTime: 0,
      }
    )
  );
  const settled = debounced === value && !check.isFetching;
  const available = settled && check.data?.code === normalized && check.data.available;
  const taken = settled && check.data?.code === normalized && !check.data.available;

  const done = (message: string) => {
    toast.success(message);
    onOpenChange(false);
    onDone();
  };
  const approve = useMutation(
    trpc.partners.approve.mutationOptions({
      onSuccess: ({ code }) => done(`Approved. ${code} emailed to ${partnerName}.`),
      onError: (e) => toast.error(e.message),
    })
  );
  const change = useMutation(
    trpc.partners.setCode.mutationOptions({
      onSuccess: ({ code }) => done(`Code changed to ${code}.`),
      onError: (e) => toast.error(e.message),
    })
  );
  const pending = approve.isPending || change.isPending;
  const canSave = !!value.trim() && !formatError && available && !unchanged && !pending;

  return (
    <Dialog open={!!mode} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "approve" ? `Approve ${partnerName}` : "Change referral code"}</DialogTitle>
          <DialogDescription>
            {mode === "approve"
              ? "Choose their referral code. We'll email it to them once you approve."
              : `The current code ${currentCode ?? ""} stops working right away.`}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSave) return;
            if (mode === "approve") approve.mutate({ id: partnerId, code: value });
            else change.mutate({ id: partnerId, code: value, notify });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="partner-code">Referral code</Label>
            <Input
              id="partner-code"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              maxLength={60}
              placeholder="e.g. ALI or SUMMER-25"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="font-mono uppercase"
              aria-invalid={!!formatError || taken}
              aria-describedby="partner-code-status"
            />
            <p id="partner-code-status" className="flex min-h-5 items-center gap-1.5 text-xs" aria-live="polite">
              {!value.trim() ? (
                <span className="text-muted-foreground">Letters, numbers and hyphens. Saved in capitals.</span>
              ) : formatError ? (
                <span className="text-destructive">{formatError}</span>
              ) : unchanged ? (
                <span className="text-muted-foreground">That's the current code.</span>
              ) : !settled ? (
                <span className="text-muted-foreground inline-flex items-center gap-1.5">
                  <Loader className="size-3 animate-spin" /> Checking {normalized}…
                </span>
              ) : taken ? (
                <span className="text-destructive inline-flex items-center gap-1.5">
                  <X className="size-3.5" /> {normalized} is already used by another partner.
                </span>
              ) : available ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Check className="size-3.5" /> {normalized} is available.
                </span>
              ) : check.isError ? (
                <span className="text-destructive">{check.error.message}</span>
              ) : null}
            </p>
          </div>
          {mode === "change" && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={notify} onCheckedChange={(v) => setNotify(!!v)} />
              Email the new code to {partnerName}
            </label>
          )}
          <DialogFooter>
            <Button type="submit" disabled={!canSave}>
              {mode === "approve" ? "Approve & email code" : "Save code"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
