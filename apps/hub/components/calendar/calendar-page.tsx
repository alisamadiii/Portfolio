"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronRight } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";

import { authClient } from "@workspace/auth/auth-client";
import { useTRPC } from "@workspace/trpc/client";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { GoogleCalendarLogo } from "@/components/ds/brand-logos";
import { PageHeader } from "@/components/ds/layout/page-header";
import { Badge } from "@/components/ds/ui/badge";
import { Button } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { EmptyState } from "@/components/ds/ui/misc";
import { useProject } from "@/hooks/use-project";
import { useRouteProjectId } from "@/hooks/use-repo";
import { handleCmsError } from "@/lib/trpc-errors";

import { CalendarFullscreen } from "./calendar-fullscreen";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

/** Project Google Calendar app: connect Google, list calendars, open one full screen. */
export function CalendarPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const fullAccess = useProject()?.role === "full-access";
  const [returned, setReturned] = useQueryState("gcal", parseAsString);
  const [openId, setOpenId] = useQueryState("calendar", parseAsString);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const status = useQuery(trpc.gcal.status.queryOptions({ projectId }));
  const connected = !!status.data?.connected;
  const calendars = useQuery(
    trpc.gcal.calendars.queryOptions({ projectId }, { enabled: connected, retry: false })
  );

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.gcal.status.queryKey({ projectId }) });
    void queryClient.invalidateQueries({ queryKey: trpc.gcal.calendars.queryKey({ projectId }) });
  };

  const connect = useMutation(
    trpc.gcal.connect.mutationOptions({
      onSuccess: () => {
        toast.success("Google Calendar connected.");
        refresh();
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't connect Google Calendar.")),
    })
  );
  const disconnect = useMutation(
    trpc.gcal.disconnect.mutationOptions({
      onSuccess: () => {
        void setOpenId(null);
        refresh();
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't disconnect Google Calendar.")),
    })
  );

  // Back from Google's consent screen: bind the account that was just linked.
  useEffect(() => {
    if (returned !== "connected" || !status.data) return;
    void setReturned(null);
    if (fullAccess) connect.mutate({ projectId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returned, status.data, fullAccess]);

  // Always through Google's consent screen, so the client picks the account.
  const startConnect = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("gcal", "connected");
    const { error } = await authClient.linkSocial({
      provider: "google",
      scopes: [CALENDAR_SCOPE],
      callbackURL: url.toString(),
    });
    if (error) toast.error(error.message ?? "Couldn't start Google sign-in.");
  };

  const header = (
    <PageHeader
      title="Google Calendar"
      description={
        status.data?.email
          ? `Connected as ${status.data.email}.`
          : "Your calendars and upcoming appointments, right in the hub."
      }
      actions={
        connected && fullAccess ? (
          <Button
            variant="ghost"
            onClick={() => setConfirmDisconnect(true)}
            disabled={disconnect.isPending}
          >
            {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
          </Button>
        ) : undefined
      }
    />
  );

  const disconnectDialog = (
    <ConfirmDialog
      open={confirmDisconnect}
      onOpenChange={setConfirmDisconnect}
      title="Disconnect Google Calendar?"
      description="This project stops showing your calendars. Nothing changes in Google Calendar, and you can connect again anytime."
      confirmLabel="Disconnect"
      danger
      onConfirm={() => disconnect.mutate({ projectId })}
    />
  );

  if (status.isPending) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Skeleton className="h-[280px] rounded-card" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Card>
          <EmptyState
            icon={<GoogleCalendarLogo className="size-5" />}
            title="Connect Google Calendar"
            text={
              fullAccess
                ? "Sign in with the Google account that holds your calendars. You won't need to share your password."
                : "The site owner hasn't connected Google Calendar yet."
            }
            action={
              fullAccess && (
                <Button
                  variant="primary"
                  onClick={() => void startConnect()}
                  disabled={connect.isPending}
                >
                  {connect.isPending ? "Connecting…" : "Connect Google Calendar"}
                </Button>
              )
            }
          />
        </Card>
      </div>
    );
  }

  const open = calendars.data?.find((c) => c.id === openId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      {header}
      {disconnectDialog}
      <Card>
        <CardHeader title="Calendars" divided />
        {calendars.isPending ? (
          <Skeleton className="m-6 h-[160px]" />
        ) : calendars.isError ? (
          <EmptyState
            icon={<CalendarDays className="size-5" />}
            title="Couldn't load your calendars"
            text={handleCmsError(calendars.error, "Google didn't answer. Try again in a moment.")}
            action={
              fullAccess && (
                <Button variant="primary" onClick={() => void startConnect()}>
                  Reconnect Google Calendar
                </Button>
              )
            }
          />
        ) : calendars.data.length === 0 ? (
          <p className="px-6 py-8 text-center text-[13px] text-dim">No calendars in this Google account.</p>
        ) : (
          <ul className="flex flex-col">
            {calendars.data.map((c) => (
              <li key={c.id} className="border-b border-divider last:border-b-0">
                <button
                  type="button"
                  onClick={() => void setOpenId(c.id)}
                  className="flex w-full items-center gap-3 px-6 py-3.5 text-left transition-colors hover:bg-sidebar"
                >
                  <span
                    className="size-3 shrink-0 rounded-full bg-faint"
                    style={c.color ? { backgroundColor: c.color } : undefined}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-ink">{c.name}</span>
                    {c.description && (
                      <span className="truncate text-[13px] text-dim">{c.description}</span>
                    )}
                  </span>
                  {c.primary && <Badge tone="info">Main</Badge>}
                  {c.accessRole === "reader" || c.accessRole === "freeBusyReader" ? (
                    <Badge tone="neutral">View only</Badge>
                  ) : null}
                  <ChevronRight className="size-4 shrink-0 text-faint" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <AnimatePresence>
        {open && (
          <CalendarFullscreen
            key={open.id}
            projectId={projectId}
            calendar={open}
            onClose={() => void setOpenId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
