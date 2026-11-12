"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useTRPC } from "@workspace/trpc/client";

import { Badge } from "@/components/ds/ui/badge";
import { Button } from "@/components/ds/ui/button";
import type { IntegrationApp } from "@/lib/integrations";

import { IntegrationRow } from "./integration-row";

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

  // Server-side disconnect — Better Auth's unlink-account endpoint demands a
  // fresh session and rejects older ones, which made it unusable here.
  const disconnectMutation = useMutation(
    trpc.integrations.disconnect.mutationOptions({
      onSuccess: () => {
        toast.success(`${app.name} disconnected.`);
        queryClient.invalidateQueries({
          queryKey: trpc.integrations.status.queryOptions().queryKey,
        });
      },
      onError: (error) =>
        toast.error(error.message || `Could not disconnect ${app.name}.`),
      onSettled: () => setBusy(false),
    })
  );

  const disconnect = () => {
    setBusy(true);
    disconnectMutation.mutate({
      id: app.id as "google-analytics" | "google-calendar",
    });
  };

  const badge =
    status?.connected &&
    (status.needsReconnect ? (
      <Badge tone="warning" dot>
        Reconnect needed
      </Badge>
    ) : (
      <Badge tone="success" dot>
        Connected
      </Badge>
    ));

  const action =
    status?.connected && status.needsReconnect ? (
      <>
        <Button variant="primary" size="sm" onClick={connect} disabled={busy}>
          {busy ? "Reconnecting…" : "Reconnect"}
        </Button>
        <Button size="sm" onClick={disconnect} disabled={busy}>
          Disconnect
        </Button>
      </>
    ) : status?.connected ? (
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button size="sm" disabled={busy}>
              Disconnect
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {app.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {app.unlinkWarning ?? `This removes the ${app.name} connection from your account.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={disconnect}>Disconnect</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ) : (
      <Button variant="primary" size="sm" onClick={connect} disabled={busy || !status}>
        {busy ? "Connecting…" : "Connect"}
      </Button>
    );

  return (
    <IntegrationRow
      icon={app.logo}
      name={app.name}
      badge={badge}
      description={app.description}
      action={action}
    />
  );
};
