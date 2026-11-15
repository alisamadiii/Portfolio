"use client";

import { useState } from "react";
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

import { NetlifyLogo } from "@/components/ds/brand-logos";
import { INTEGRATION_APPS } from "@/lib/integrations";

/** Query param set on the OAuth return URL; the caller reopens its flow on it. */
export const NETLIFY_CONNECTED_PARAM = "netlify";

/**
 * Websites are hosted on the client's own Netlify: shown instead of publishing
 * when they haven't connected it yet. Connect runs the Netlify OAuth link and
 * comes back to this page with ?netlify=connected.
 */
export function NetlifyConnectDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);

  const connect = async () => {
    setPending(true);
    const url = new URL(window.location.href);
    url.searchParams.set(NETLIFY_CONNECTED_PARAM, "connected");
    const app = INTEGRATION_APPS.find((a) => a.id === "netlify");
    const error = await app?.connect(url.toString());
    if (error) {
      toast.error(error.message ?? "Couldn't connect Netlify.");
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <span className="mb-1 grid size-10 place-items-center rounded-control border border-line bg-surface">
            <NetlifyLogo className="size-5" />
          </span>
          <DialogTitle>Connect Netlify to go live</DialogTitle>
          <DialogDescription>
            Your website is hosted on your own Netlify account. Connect it once and publish.
            You&apos;ll come back here after.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Not now
          </Button>
          <Button disabled={pending} onClick={() => void connect()}>
            {pending ? "Connecting…" : "Connect Netlify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
