"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Loader2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import { useTRPC } from "@workspace/trpc/client";

import { connectGoogleCalendar } from "@/lib/google-calendar";

export const IntegrationsDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const status = useQuery(trpc.integrations.status.queryOptions());
  const calendar = status.data?.find((row) => row.id === "google-calendar");
  const profile = useQuery(
    trpc.integrations.profile.queryOptions(
      { id: "google-calendar" },
      { enabled: open && !!calendar?.connected && !calendar.needsReconnect }
    )
  );

  const connect = async () => {
    setBusy(true);
    // On success the browser navigates to Google's consent screen and comes
    // back here, so only the error path ever resets `busy`.
    const error = await connectGoogleCalendar(window.location.href);
    if (error) {
      toast.error(error.message ?? "Could not connect Google Calendar.");
      setBusy(false);
    }
  };

  const disconnect = useMutation(
    trpc.integrations.disconnect.mutationOptions({
      onSuccess: () => {
        toast.success("Google Calendar disconnected.");
        queryClient.invalidateQueries({
          queryKey: trpc.integrations.status.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.integrations.profile.queryKey(),
        });
      },
      onError: (error) =>
        toast.error(error.message || "Could not disconnect Google Calendar."),
    })
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Integrations</DialogTitle>
          <DialogDescription>
            Apps connected to your Lead Finder account.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-card flex items-start justify-between gap-3 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <span className="bg-background flex size-10 shrink-0 items-center justify-center rounded-xl border">
              <CalendarDays className="size-5 text-blue-600" />
            </span>
            <div>
              <p className="flex items-center gap-2 text-sm font-medium">
                Google Calendar
                {calendar?.connected && !calendar.needsReconnect && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    Connected
                  </span>
                )}
                {calendar?.connected && calendar.needsReconnect && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    <span className="size-1.5 rounded-full bg-amber-500" />
                    Reconnect
                  </span>
                )}
              </p>
              <p className="text-muted-foreground text-xs">
                Schedule meetings with leads, invites sent automatically.
              </p>
              {profile.data && (
                <span className="mt-1.5 flex w-fit items-center gap-1.5 rounded-full bg-[#e8f0fe] p-0.5 pr-4 text-xs font-medium text-[#174ea6]">
                  {profile.data.picture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.data.picture}
                      alt=""
                      className="size-6 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex size-5 items-center justify-center rounded-full bg-[#1a73e8] text-[10px] font-bold text-white">
                      {(profile.data.name ?? profile.data.email ?? "?")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                  <span className="flex flex-col -space-y-0.5 text-[10px]">
                    <span>{profile.data.name ?? profile.data.email}</span>
                    {profile.data.name && profile.data.email && (
                      <span className="font-normal text-[#174ea6]/70 max-sm:hidden">
                        {profile.data.email}
                      </span>
                    )}
                  </span>
                </span>
              )}
            </div>
          </div>
          {status.isLoading ? (
            <Loader2 className="text-muted-foreground size-4 animate-spin" />
          ) : calendar?.connected && !calendar.needsReconnect ? (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <button
                    disabled={disconnect.isPending}
                    className="btn-pill btn-light h-8 px-3 text-xs"
                  >
                    {disconnect.isPending && (
                      <Loader2 className="size-3.5 animate-spin" />
                    )}
                    Disconnect
                  </button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Disconnect Google Calendar?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This unlinks your whole Google account from sign-in, not
                    just Calendar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => disconnect.mutate({ id: "google-calendar" })}
                  >
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <button
              disabled={busy}
              onClick={connect}
              className="btn-pill btn-dark h-8 px-3 text-xs"
            >
              {busy && <Loader2 className="size-3.5 animate-spin" />}
              {calendar?.needsReconnect ? "Reconnect" : "Connect"}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
