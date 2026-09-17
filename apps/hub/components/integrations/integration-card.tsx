"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";

import { useTRPC } from "@workspace/trpc/client";
import { authClient } from "@workspace/auth/auth-client";

import type { IntegrationApp } from "@/lib/integrations";

type Status = {
  connected: boolean;
  needsReconnect: boolean;
  providerId: string;
  accountId: string | null;
};

export const IntegrationCard = ({
  app,
  status,
}: {
  app: IntegrationApp;
  status: Status | undefined;
}) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    setBusy(true);
    // On success the browser navigates to the provider's consent screen and
    // returns here, so only the error path ever resets `busy`.
    const error = await app.connect(window.location.href);
    if (error) {
      toast.error(error.message ?? `Could not connect ${app.name}.`);
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!status?.accountId) return;
    setBusy(true);
    const { error } = await authClient.unlinkAccount({
      providerId: status.providerId,
      accountId: status.accountId,
    });
    if (error) {
      toast.error(error.message ?? `Could not disconnect ${app.name}.`);
    } else {
      toast.success(`${app.name} disconnected.`);
      await queryClient.invalidateQueries({
        queryKey: trpc.integrations.status.queryOptions().queryKey,
      });
    }
    setBusy(false);
  };

  return (
    <Card className="py-0">
      <CardContent className="flex h-full flex-col gap-4 p-5.5">
        <div className="flex items-center justify-between">
          <div className="bg-muted/60 border-border flex size-11 items-center justify-center rounded-[12px] border">
            {app.logo}
          </div>
          {status?.connected &&
            (status.needsReconnect ? (
              <Badge className="gap-1.5 rounded-full border-transparent bg-amber-100 px-3 py-1 text-[12.5px] font-semibold text-amber-700">
                <span className="size-1.5 rounded-full bg-amber-500" />
                Reconnect needed
              </Badge>
            ) : (
              <Badge className="bg-status-success-bg text-status-success gap-1.5 rounded-full border-transparent px-3 py-1 text-[12.5px] font-semibold">
                <span className="bg-status-success size-1.5 rounded-full" />
                Connected
              </Badge>
            ))}
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="text-[15.5px] font-bold">{app.name}</h4>
          <p className="text-muted-foreground text-[13.5px] leading-relaxed">
            {app.description}
          </p>
        </div>
        {status?.connected && status.needsReconnect ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={connect} disabled={busy}>
              {busy ? "Reconnecting…" : "Reconnect"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={disconnect}
              disabled={busy}
            >
              Disconnect
            </Button>
          </div>
        ) : status?.connected ? (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="outline" size="sm" disabled={busy}>
                  Disconnect
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect {app.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  {app.unlinkWarning ??
                    `This removes the ${app.name} connection from your account.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={disconnect}>
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button size="sm" onClick={connect} disabled={busy || !status}>
            {busy ? "Connecting…" : "Connect"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
