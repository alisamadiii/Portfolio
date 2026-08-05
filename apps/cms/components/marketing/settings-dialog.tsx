"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

import { useTRPC } from "@workspace/trpc/client";

/**
 * Sender profile for marketing sends. The postal address is legally required
 * in every bulk email footer (CAN-SPAM), so sending is blocked until it and
 * the from address are filled in.
 */
export function MarketingSettingsDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: settings } = useQuery(
    trpc.marketing.settings.get.queryOptions(undefined, { enabled: open })
  );

  const [form, setForm] = useState({
    fromName: "",
    fromEmail: "",
    replyTo: "",
    postalAddress: "",
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      fromName: settings.fromName ?? "",
      fromEmail: settings.fromEmail ?? "",
      replyTo: settings.replyTo ?? "",
      postalAddress: settings.postalAddress ?? "",
    });
  }, [settings]);

  const update = useMutation(
    trpc.marketing.settings.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.marketing.settings.get.queryKey(),
        });
        toast.success("Marketing settings saved.");
        setOpen(false);
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sender settings</DialogTitle>
          <DialogDescription>
            Who your marketing emails come from. The postal address appears in
            the footer of every email — it&apos;s legally required for bulk
            mail.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mk-from-name">From name</Label>
            <Input
              id="mk-from-name"
              value={form.fromName}
              onChange={(e) => set("fromName")(e.target.value)}
              placeholder="Acme Inc."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mk-from-email">From email</Label>
            <Input
              id="mk-from-email"
              type="email"
              value={form.fromEmail}
              onChange={(e) => set("fromEmail")(e.target.value)}
              placeholder="news@yourdomain.com"
            />
            <p className="text-muted-foreground text-xs">
              Must be on your verified sending domain.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mk-reply-to">Reply-to (optional)</Label>
            <Input
              id="mk-reply-to"
              type="email"
              value={form.replyTo}
              onChange={(e) => set("replyTo")(e.target.value)}
              placeholder="hello@yourdomain.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mk-postal">Postal address</Label>
            <Textarea
              id="mk-postal"
              value={form.postalAddress}
              onChange={(e) => set("postalAddress")(e.target.value)}
              placeholder={"Acme Inc.\n123 Main St, Springfield"}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={update.isPending}
            onClick={() =>
              update.mutate({
                fromName: form.fromName.trim() || null,
                fromEmail: form.fromEmail.trim() || null,
                replyTo: form.replyTo.trim() || null,
                postalAddress: form.postalAddress.trim() || null,
              })
            }
          >
            {update.isPending ? "Saving…" : "Save settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
