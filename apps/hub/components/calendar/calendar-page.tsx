"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";

import { authClient } from "@workspace/auth/auth-client";
import { useTRPC } from "@workspace/trpc/client";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { GoogleCalendarLogo } from "@/components/ds/brand-logos";
import { PageHeader } from "@/components/ds/layout/page-header";
import { Button } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { EmptyState } from "@/components/ds/ui/misc";
import { useProject } from "@/hooks/use-project";
import { useRouteProjectId } from "@/hooks/use-repo";
import { handleCmsError } from "@/lib/trpc-errors";

import { CalendarWeek } from "./calendar-week";

// Verified calendar.events (shared with the leads scheduler) + the
// non-sensitive calendar list.
const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
];

/** Padded column for the connect / loading / error states (the shell is edge to edge here). */
function Padded({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto px-4 pb-12 pt-6 sm:px-10 sm:pt-8">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-6">{children}</div>
    </div>
  );
}

/** Project Google Calendar app: connect Google, then a week view filling the page. */
export function CalendarPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const fullAccess = useProject()?.role === "full-access";
  const [returned, setReturned] = useQueryState("gcal", parseAsString);
  // Calendars unticked in the picker (empty = show them all), kept in the URL.
  const [hidden, setHidden] = useQueryState("hide", parseAsArrayOf(parseAsString).withDefault([]));
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
        void setHidden(null);
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
      scopes: CALENDAR_SCOPES,
      callbackURL: url.toString(),
    });
    if (error) toast.error(error.message ?? "Couldn't start Google sign-in.");
  };

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

  const header = (
    <PageHeader
      title="Google Calendar"
      description="Your calendars and upcoming appointments, right in the hub."
    />
  );

  if (status.isPending || (connected && calendars.isPending)) {
    return (
      <Padded>
        {header}
        <Skeleton className="h-[420px] rounded-card" />
      </Padded>
    );
  }

  if (!connected) {
    return (
      <Padded>
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
      </Padded>
    );
  }

  if (calendars.isError) {
    return (
      <Padded>
        {header}
        {disconnectDialog}
        <Card>
          <EmptyState
            icon={<CalendarDays className="size-5" />}
            title="Couldn't load your calendars"
            text={handleCmsError(calendars.error, "Google didn't answer. Try again in a moment.")}
            action={
              fullAccess && (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="primary" onClick={() => void startConnect()}>
                    Reconnect Google Calendar
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmDisconnect(true)}>
                    Disconnect
                  </Button>
                </div>
              )
            }
          />
        </Card>
      </Padded>
    );
  }

  const list = calendars.data ?? [];
  return (
    <>
      {disconnectDialog}
      <CalendarWeek
        projectId={projectId}
        calendars={list}
        shown={list.map((c) => c.id).filter((id) => !hidden.includes(id))}
        onShownChange={(ids) => void setHidden(list.map((c) => c.id).filter((id) => !ids.includes(id)))}
        canCreate={fullAccess}
        actions={
          <>
            {status.data?.email && (
              <span className="hidden max-w-[220px] truncate text-[13px] text-dim lg:inline">
                {status.data.email}
              </span>
            )}
            {fullAccess && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmDisconnect(true)}
                disabled={disconnect.isPending}
              >
                {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
              </Button>
            )}
          </>
        }
      />
    </>
  );
}
