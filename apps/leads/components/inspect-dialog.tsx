"use client";

import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import { useTRPC } from "@workspace/trpc/client";

import { InspectorResults, QuickSummary } from "@/components/site-inspector";

// Inspect a lead's website without leaving its sheet — same report as the
// /inspect page, rendered inside a wide dialog.
export const InspectDialog = ({
  website,
  open,
  onOpenChange,
}: {
  website: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const trpc = useTRPC();
  const inspect = useMutation(trpc.leads.inspect.mutationOptions());

  // Auto-run on open; results stick around while the sheet stays mounted so
  // reopening is instant.
  useEffect(() => {
    if (open && !inspect.data && !inspect.isPending && !inspect.isError) {
      inspect.mutate({ domain: website });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Above the lead Sheet (z-50) — this dialog opens on top of it. */}
      <DialogContent
        overlayClassName="z-[60]"
        className="z-[60] max-h-[85vh] overflow-y-auto md:max-w-5xl"
      >
        <DialogHeader>
          <DialogTitle className="break-all">Inspect {website}</DialogTitle>
          <DialogDescription>
            Every tracking script, chat widget, platform, and SEO tag the site
            runs, with snippets ready to copy into a rebuild.
          </DialogDescription>
        </DialogHeader>

        {inspect.isPending && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
            <Loader2 className="size-4 animate-spin" /> Fetching and analyzing
            the site…
          </div>
        )}

        {inspect.isError && (
          <div className="space-y-3 py-8 text-center">
            <p className="text-destructive text-sm">{inspect.error.message}</p>
            <button
              className="btn-pill btn-light mx-auto h-9 px-4 text-sm"
              onClick={() => inspect.mutate({ domain: website })}
            >
              Try again
            </button>
          </div>
        )}

        {inspect.data && (
          <div className="space-y-4">
            <QuickSummary result={inspect.data} />
            <InspectorResults result={inspect.data} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
