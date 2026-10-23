"use client";

import { useMemo, useState } from "react";
import type * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
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
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Switch } from "@workspace/ui/components/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import type { AgencyBookingSettings } from "@workspace/drizzle/schema";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { useAgency } from "@/components/agency/use-agency";
import { Calendar, ChevronDown, Plus, Trash, Video, X } from "@/components/icon";
import { connectGoogleCalendar } from "@/lib/integrations";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "https://api.alisamadii.com").replace(/\/$/, "");

type Booking = RouterOutputs["agency"]["booking"]["list"][number];

// Mon..Sun display order; keys are JS weekday numbers (0 = Sunday).
const WEEKDAYS: { key: string; label: string }[] = [
  { key: "1", label: "Monday" },
  { key: "2", label: "Tuesday" },
  { key: "3", label: "Wednesday" },
  { key: "4", label: "Thursday" },
  { key: "5", label: "Friday" },
  { key: "6", label: "Saturday" },
  { key: "0", label: "Sunday" },
];

// Quarter hours only: slots live on a fixed 15-minute grid.
const TIMES = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

const DEFAULT_HOURS: AgencyBookingSettings["hours"] = {
  "1": [{ from: "09:00", to: "17:00" }],
  "2": [{ from: "09:00", to: "17:00" }],
  "3": [{ from: "09:00", to: "17:00" }],
  "4": [{ from: "09:00", to: "17:00" }],
  "5": [{ from: "09:00", to: "17:00" }],
};

const newTypeId = () => Math.random().toString(36).slice(2, 10);

const defaultSettings = (): AgencyBookingSettings => ({
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  hours: DEFAULT_HOURS,
  noticeHours: 4,
  horizonDays: 30,
  bufferMinutes: 0,
  types: [
    {
      id: newTypeId(),
      name: "Intro call",
      description: "A quick 15-minute call to see how we can help.",
      meet: false,
      active: true,
    },
  ],
});

/** Native select with our own chevron, so the arrow isn't glued to the edge. */
function SelectBox({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={cn("relative inline-flex items-center", className)}>
      <select
        {...props}
        className="border-input bg-background h-8 w-full appearance-none rounded-md border pr-7 pl-2 text-[13px]"
      />
      <ChevronDown className="text-muted-foreground pointer-events-none absolute right-2.5 size-3.5" />
    </span>
  );
}

export function BookingPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { repoId } = useAgency();

  const status = useQuery(trpc.agency.booking.status.queryOptions({ repoId }));
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: trpc.agency.booking.pathKey() });

  if (status.isPending) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (status.error)
    return <p className="text-destructive text-[14px]">{status.error.message}</p>;

  const { connected, needsReconnect, settings, formKey } = status.data;

  return (
    <div className="space-y-6">
      {!connected && <ConnectCard needsReconnect={needsReconnect} />}
      <SettingsCard
        key={JSON.stringify(settings)}
        saved={settings}
        repoId={repoId}
        onSaved={refresh}
      />
      {formKey && settings && <BookingSnippet formKey={formKey} />}
      {connected && settings && <BookingsCard repoId={repoId} />}
    </div>
  );
}

// ─── Connect ─────────────────────────────────────────────────────

function ConnectCard({ needsReconnect }: { needsReconnect: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="bg-card flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5">
      <div className="flex items-start gap-3">
        <Calendar className="text-muted-foreground mt-0.5 size-5" />
        <div>
          <p className="font-semibold">
            {needsReconnect
              ? "Reconnect Google Calendar"
              : "Connect Google Calendar"}
          </p>
          <p className="text-muted-foreground mt-0.5 max-w-xl text-[13.5px]">
            {needsReconnect
              ? "Booking also needs permission to read when you're busy. One more consent adds it to your existing connection."
              : "Booked appointments land on your calendar, invites go out automatically, and busy times never show as free."}
          </p>
        </div>
      </div>
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const error = await connectGoogleCalendar(window.location.href);
          if (error) {
            toast.error(error.message ?? "Could not start the Google consent.");
            setBusy(false);
          }
        }}
      >
        {needsReconnect ? "Reconnect" : "Connect"}
      </Button>
    </div>
  );
}

// ─── Settings ────────────────────────────────────────────────────

function SettingsCard({
  saved,
  repoId,
  onSaved,
}: {
  saved: AgencyBookingSettings | null;
  repoId: number;
  onSaved: () => void;
}) {
  const trpc = useTRPC();
  const [form, setForm] = useState<AgencyBookingSettings>(
    () => saved ?? defaultSettings()
  );
  const [dirty, setDirty] = useState(!saved);

  const patch = (next: Partial<AgencyBookingSettings>) => {
    setForm((prev) => ({ ...prev, ...next }));
    setDirty(true);
  };

  const save = useMutation(
    trpc.agency.booking.setSettings.mutationOptions({
      onSuccess: () => {
        toast.success("Booking settings saved.");
        setDirty(false);
        onSaved();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const timezones = useMemo(
    () => Intl.supportedValuesOf("timeZone"),
    []
  );

  return (
    <div className="bg-card space-y-5 rounded-2xl border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Availability</p>
          <p className="text-muted-foreground text-[13.5px]">
            Every meeting is 15 minutes. Visitors only see times inside these
            hours that are also free on your calendar.
          </p>
        </div>
        <Button
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate({ repoId, settings: form })}
        >
          {saved ? "Save changes" : "Turn on booking"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[13.5px]">
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Timezone</span>
          <SelectBox
            className="max-w-56"
            value={form.timezone}
            onChange={(e) => patch({ timezone: e.target.value })}
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </SelectBox>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Earliest booking</span>
          <SelectBox
            value={form.noticeHours ?? 4}
            onChange={(e) => patch({ noticeHours: Number(e.target.value) })}
          >
            {[0, 1, 2, 4, 12, 24, 48].map((h) => (
              <option key={h} value={h}>
                {h === 0 ? "Any time" : h < 24 ? `${h}h ahead` : `${h / 24}d ahead`}
              </option>
            ))}
          </SelectBox>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Open up to</span>
          <SelectBox
            value={form.horizonDays ?? 30}
            onChange={(e) => patch({ horizonDays: Number(e.target.value) })}
          >
            {[7, 14, 30, 60, 90].map((d) => (
              <option key={d} value={d}>
                {d} days ahead
              </option>
            ))}
          </SelectBox>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Gap after meetings</span>
          <SelectBox
            value={form.bufferMinutes ?? 0}
            onChange={(e) => patch({ bufferMinutes: Number(e.target.value) })}
          >
            {[0, 15, 30].map((m) => (
              <option key={m} value={m}>
                {m ? `${m} min` : "None"}
              </option>
            ))}
          </SelectBox>
        </label>
      </div>

      <div className="space-y-2">
        {WEEKDAYS.map((day) => {
          const ranges = form.hours[day.key] ?? [];
          const setRanges = (next: { from: string; to: string }[]) =>
            patch({ hours: { ...form.hours, [day.key]: next } });
          return (
            <div key={day.key} className="flex flex-wrap items-center gap-3">
              <label className="flex w-32 items-center gap-2 text-[13.5px] font-medium">
                <Checkbox
                  checked={ranges.length > 0}
                  onCheckedChange={(checked) =>
                    setRanges(checked ? [{ from: "09:00", to: "17:00" }] : [])
                  }
                />
                {day.label}
              </label>
              {ranges.length === 0 && (
                <span className="text-muted-foreground text-[13px]">Closed</span>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {ranges.map((range, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <SelectBox
                      value={range.from}
                      onChange={(e) =>
                        setRanges(
                          ranges.map((r, j) =>
                            j === i ? { ...r, from: e.target.value } : r
                          )
                        )
                      }
                    >
                      {TIMES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </SelectBox>
                    <span className="text-muted-foreground">to</span>
                    <SelectBox
                      value={range.to}
                      onChange={(e) =>
                        setRanges(
                          ranges.map((r, j) =>
                            j === i ? { ...r, to: e.target.value } : r
                          )
                        )
                      }
                    >
                      {TIMES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </SelectBox>
                    {ranges.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setRanges(ranges.filter((_, j) => j !== i))}
                      >
                        <X className="size-3.5" />
                      </Button>
                    )}
                  </span>
                ))}
                {ranges.length > 0 && ranges.length < 4 && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Add another range"
                    onClick={() => {
                      const last = ranges.at(-1)!;
                      setRanges([...ranges, { from: last.to, to: "23:45" }]);
                    }}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-3 border-t pt-4">
        <div>
          <p className="font-semibold">Meeting types</p>
          <p className="text-muted-foreground text-[13.5px]">
            What visitors pick from. All types share the hours above; the Meet
            switch adds a Google Meet link to the invite.
          </p>
        </div>
        {form.types.map((type, i) => {
          const setType = (next: Partial<AgencyBookingSettings["types"][number]>) =>
            patch({
              types: form.types.map((t, j) => (j === i ? { ...t, ...next } : t)),
            });
          return (
            <div
              key={type.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border p-3"
            >
              <Input
                className="h-8 w-44 text-[13.5px]"
                value={type.name}
                placeholder="Name"
                onChange={(e) => setType({ name: e.target.value })}
              />
              <Input
                className="h-8 min-w-48 flex-1 text-[13.5px]"
                value={type.description ?? ""}
                placeholder="Short description (optional)"
                onChange={(e) => setType({ description: e.target.value })}
              />
              <label className="flex items-center gap-1.5 text-[13px]">
                <Video className="text-muted-foreground size-4" />
                Meet
                <Switch
                  checked={Boolean(type.meet)}
                  onCheckedChange={(meet) => setType({ meet })}
                />
              </label>
              <label className="flex items-center gap-1.5 text-[13px]">
                Active
                <Switch
                  checked={type.active !== false}
                  onCheckedChange={(active) => setType({ active })}
                />
              </label>
              {form.types.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    patch({ types: form.types.filter((_, j) => j !== i) })
                  }
                >
                  <Trash className="size-3.5" />
                </Button>
              )}
            </div>
          );
        })}
        {form.types.length < 10 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              patch({
                types: [
                  ...form.types,
                  { id: newTypeId(), name: "", meet: false, active: true },
                ],
              })
            }
          >
            <Plus className="size-4" /> Add meeting type
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Install snippet ─────────────────────────────────────────────

function BookingSnippet({ formKey }: { formKey: string }) {
  const snippet = `<script src="${API_URL}/b.js" data-key="${formKey}" defer></script>\n<button data-booking>Book an appointment</button>`;
  return (
    <details className="bg-card rounded-lg border px-5 py-3 text-[14px]">
      <summary className="cursor-pointer font-semibold">Put booking on the website</summary>
      <div className="mt-3 space-y-3">
        <p className="text-muted-foreground">
          Add <code>data-booking</code> to any button or link on the site: the
          site keeps its own button styling, and clicking it opens the booking
          dialog on top of the page, booking straight into your calendar.
          Optional attributes on that element:{" "}
          <code>data-accent=&quot;#0f766e&quot;</code> recolors the dialog (the
          default is our orange), <code>data-theme=&quot;dark&quot;</code>{" "}
          makes it dark. If the capture script (f.js) is on the page too,
          bookings are credited to the ad that brought the visitor.
        </p>
        <div className="flex items-start gap-2">
          <code className="bg-muted flex-1 rounded-md p-3 text-[12.5px] whitespace-pre-wrap">
            {snippet}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigator.clipboard.writeText(snippet).then(() => toast.success("Copied."))
            }
          >
            Copy
          </Button>
        </div>
      </div>
    </details>
  );
}

// ─── Bookings list ───────────────────────────────────────────────

function BookingsCard({ repoId }: { repoId: number }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const bookings = useQuery(trpc.agency.booking.list.queryOptions({ repoId }));
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: trpc.agency.booking.pathKey() });

  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Booking | null>(null);

  const cancel = useMutation(
    trpc.agency.booking.cancel.mutationOptions({
      onSuccess: () => {
        toast.success("Booking canceled. The visitor was notified.");
        setCancelTarget(null);
        refresh();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  if (bookings.isPending) return <Skeleton className="h-40 w-full rounded-2xl" />;
  if (bookings.error) return null;

  const upcoming = bookings.data.filter(
    (b) => !b.bookingCanceledAt && b.bookingAt && new Date(b.bookingAt) >= new Date()
  );
  const past = bookings.data.filter(
    (b) => b.bookingCanceledAt || (b.bookingAt && new Date(b.bookingAt) < new Date())
  );

  if (!bookings.data.length) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center">
        <p className="font-semibold">No bookings yet</p>
        <p className="text-muted-foreground mt-1 text-[14px]">
          Appointments booked on your website appear here and in your leads,
          with where each one came from.
        </p>
      </div>
    );
  }

  const rows = [...upcoming].reverse().concat(past);

  return (
    <div className="bg-card overflow-hidden rounded-2xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-5">When</TableHead>
            <TableHead>Who</TableHead>
            <TableHead>Meeting</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((booking) => {
            const at = booking.bookingAt ? new Date(booking.bookingAt) : null;
            const canceled = Boolean(booking.bookingCanceledAt);
            const isPast = Boolean(at && at < new Date());
            return (
              <TableRow key={booking.id} className={cn(canceled && "opacity-55")}>
                <TableCell className="pl-5 whitespace-nowrap">
                  <span className="font-medium">
                    {at ? format(at, "EEE, MMM d") : "–"}
                  </span>
                  <p className="text-muted-foreground text-[12.5px]">
                    {at ? format(at, "p") : ""}
                    {canceled ? " · Canceled" : ""}
                  </p>
                </TableCell>
                <TableCell>
                  <a className="font-medium hover:underline" href={`/agency/${booking.id}`}>
                    {booking.name ?? booking.email ?? "Visitor"}
                  </a>
                  <p className="text-muted-foreground text-[12.5px]">{booking.email}</p>
                </TableCell>
                <TableCell>
                  <span className="text-[13.5px]">{booking.booking?.typeName}</span>
                  <span className="text-muted-foreground ml-2 inline-flex items-center gap-2 text-[12.5px]">
                    {booking.booking?.meetUrl && (
                      <a
                        className="hover:underline"
                        href={booking.booking.meetUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Meet link
                      </a>
                    )}
                    {booking.booking?.htmlLink && (
                      <a
                        className="hover:underline"
                        href={booking.booking.htmlLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Calendar
                      </a>
                    )}
                    {booking.booking?.eventError && (
                      <span className="text-destructive">Calendar event failed</span>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {!canceled && !isPast && (
                    <span className="flex justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRescheduleTarget(booking)}
                      >
                        Reschedule
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCancelTarget(booking)}
                      >
                        Cancel
                      </Button>
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this booking?</DialogTitle>
            <DialogDescription>
              {cancelTarget?.name ?? "The visitor"} gets a cancellation email
              from Google Calendar and the slot opens up again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              disabled={cancel.isPending}
              onClick={() =>
                cancelTarget && cancel.mutate({ repoId, leadId: cancelTarget.id })
              }
            >
              Cancel booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {rescheduleTarget && (
        <RescheduleDialog
          repoId={repoId}
          booking={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onDone={() => {
            setRescheduleTarget(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

// ─── Reschedule ──────────────────────────────────────────────────

function RescheduleDialog({
  repoId,
  booking,
  onClose,
  onDone,
}: {
  repoId: number;
  booking: Booking;
  onClose: () => void;
  onDone: () => void;
}) {
  const trpc = useTRPC();
  const range = useMemo(() => {
    const from = new Date();
    const to = new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);
  const slots = useQuery(
    trpc.agency.booking.slots.queryOptions({ repoId, ...range })
  );
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);

  const reschedule = useMutation(
    trpc.agency.booking.reschedule.mutationOptions({
      onSuccess: () => {
        toast.success("Booking moved. Both sides were notified.");
        onDone();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const byDay = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const iso of slots.data?.slots ?? []) {
      const key = format(new Date(iso), "yyyy-MM-dd");
      groups.set(key, [...(groups.get(key) ?? []), iso]);
    }
    return groups;
  }, [slots.data]);
  const days = [...byDay.keys()];
  const activeDay = day ?? days[0] ?? null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reschedule {booking.booking?.typeName}</DialogTitle>
          <DialogDescription>
            Pick a new time for {booking.name ?? booking.email}. The calendar
            invite moves and both of you get the update.
          </DialogDescription>
        </DialogHeader>
        {slots.isPending ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : !days.length ? (
          <p className="text-muted-foreground py-6 text-center text-[14px]">
            No free times in the next two weeks.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {days.map((d) => (
                <Button
                  key={d}
                  variant={d === activeDay ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setDay(d);
                    setSlot(null);
                  }}
                >
                  {format(new Date(`${d}T12:00:00`), "EEE d")}
                </Button>
              ))}
            </div>
            <div className="grid max-h-48 grid-cols-4 gap-1.5 overflow-y-auto">
              {(activeDay ? (byDay.get(activeDay) ?? []) : []).map((iso) => (
                <Button
                  key={iso}
                  variant={slot === iso ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSlot(iso)}
                >
                  {format(new Date(iso), "p")}
                </Button>
              ))}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button
            disabled={!slot || reschedule.isPending}
            onClick={() =>
              slot && reschedule.mutate({ repoId, leadId: booking.id, at: slot })
            }
          >
            Move booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
