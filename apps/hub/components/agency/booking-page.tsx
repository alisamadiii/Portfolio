"use client";

import { useMemo, useState } from "react";
import type * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Switch } from "@workspace/ui/components/switch";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import type { AgencyBookingSettings } from "@workspace/drizzle/schema";

import {
  type Booking,
  CancelBookingDialog,
  RescheduleDialog,
} from "@/components/agency/booking-dialogs";
import { FieldHead, FrameCard, PageShell } from "@/components/agency/page-shell";
import { StatusPill } from "@/components/agency/lead-status";
import { useAgency, useAgencyHref } from "@/components/agency/use-agency";
import { Calendar, ChevronDown, Plus, Trash, Video, X } from "@/components/icon";
import { connectGoogleCalendar } from "@/lib/integrations";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "https://api.alisamadii.com").replace(/\/$/, "");

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
        className="border-foreground/15 bg-card h-9 w-full appearance-none rounded-[10px] border pr-8 pl-3 text-[15px]"
      />
      <ChevronDown className="text-muted-foreground pointer-events-none absolute right-2.5 size-4" />
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

  const taking = Boolean(status.data?.connected && status.data?.settings);

  return (
    <PageShell
      eyebrow="LEAD TRACKERS"
      title="Booking"
      lead="Let people book a time straight into your calendar from the website, and manage upcoming appointments here."
      controls={
        status.data &&
        (taking ? (
          <StatusPill tone="success">Taking bookings</StatusPill>
        ) : (
          <StatusPill tone="neutral">Off</StatusPill>
        ))
      }
    >
      {status.isPending ? (
        <Skeleton className="h-96 w-full rounded-[18px]" />
      ) : status.error ? (
        <p className="text-destructive text-[15px]">{status.error.message}</p>
      ) : (
        <div className="flex flex-col gap-6">
          {status.data.connected && status.data.settings && (
            <BookingsCard repoId={repoId} />
          )}
          {!status.data.connected && (
            <ConnectCard needsReconnect={status.data.needsReconnect} />
          )}
          <SettingsCard
            key={JSON.stringify(status.data.settings)}
            saved={status.data.settings}
            repoId={repoId}
            onSaved={refresh}
          />
          {status.data.formKey && status.data.settings && (
            <BookingSnippet formKey={status.data.formKey} />
          )}
        </div>
      )}
    </PageShell>
  );
}

// ─── Connect ─────────────────────────────────────────────────────

function ConnectCard({ needsReconnect }: { needsReconnect: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <FrameCard innerClassName="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <Calendar className="text-muted-foreground mt-0.5 size-5" />
        <div>
          <p className="text-[17px] font-semibold">
            {needsReconnect
              ? "Reconnect Google Calendar"
              : "Connect Google Calendar"}
          </p>
          <p className="text-muted-foreground mt-0.5 max-w-xl text-[15px]">
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
    </FrameCard>
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

  const timezones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);

  return (
    <div className="bg-card ring-foreground/7 flex flex-col gap-6 rounded-[18px] p-7 shadow-[0_6px_16px_rgba(27,26,23,0.05)] ring-1">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[18px] font-semibold">Availability</p>
          <p className="text-muted-foreground text-[15px]">
            Every meeting is 15 minutes. Visitors only see times inside these
            hours that are also free on your calendar.
          </p>
        </div>
      </div>

      {/* Booking rules */}
      <div className="flex flex-wrap gap-x-6 gap-y-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-[14px]">Timezone</span>
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
        <label className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-[14px]">
            Earliest booking
          </span>
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
        <label className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-[14px]">Open up to</span>
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
        <label className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-[14px]">
            Gap after meetings
          </span>
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

      {/* Weekly hours */}
      <div className="border-foreground/7 flex flex-col gap-2 border-t pt-5">
        <p className="text-[16px] font-semibold">Weekly hours</p>
        {WEEKDAYS.map((day) => {
          const ranges = form.hours[day.key] ?? [];
          const open = ranges.length > 0;
          const setRanges = (next: { from: string; to: string }[]) =>
            patch({ hours: { ...form.hours, [day.key]: next } });
          return (
            <div
              key={day.key}
              className={cn(
                "flex flex-wrap items-center gap-3 py-1",
                !open && "text-muted-foreground"
              )}
            >
              <label className="flex w-36 items-center gap-2.5 text-[15px] font-medium">
                <Switch
                  checked={open}
                  onCheckedChange={(checked) =>
                    setRanges(checked ? [{ from: "09:00", to: "17:00" }] : [])
                  }
                />
                {day.label}
              </label>
              {!open && <span className="text-[14px]">Closed</span>}
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
                        aria-label="Remove range"
                        onClick={() => setRanges(ranges.filter((_, j) => j !== i))}
                      >
                        <X className="size-3.5" />
                      </Button>
                    )}
                  </span>
                ))}
                {open && ranges.length < 4 && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Add another range"
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

      {/* Meeting types */}
      <div className="border-foreground/7 flex flex-col gap-3 border-t pt-5">
        <div>
          <p className="text-[16px] font-semibold">Meeting types</p>
          <p className="text-muted-foreground text-[15px]">
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
              className="border-foreground/10 flex flex-wrap items-center gap-3 rounded-[14px] border p-3.5"
            >
              <Input
                className="h-9 w-44 text-[15px]"
                value={type.name}
                placeholder="Name"
                onChange={(e) => setType({ name: e.target.value })}
              />
              <Input
                className="h-9 min-w-48 flex-1 text-[15px]"
                value={type.description ?? ""}
                placeholder="Short description (optional)"
                onChange={(e) => setType({ description: e.target.value })}
              />
              <label className="flex items-center gap-1.5 text-[14px]">
                <Video className="text-muted-foreground size-4" />
                Meet
                <Switch
                  checked={Boolean(type.meet)}
                  onCheckedChange={(meet) => setType({ meet })}
                />
              </label>
              <label className="flex items-center gap-1.5 text-[14px]">
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
                  aria-label="Remove meeting type"
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
            className="self-start"
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

      {/* Save bar */}
      <div className="border-foreground/7 flex items-center justify-between gap-3 border-t pt-4">
        <span className="text-muted-foreground text-[14px]">
          {dirty ? "You have unsaved changes." : "No unsaved changes."}
        </span>
        <Button
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate({ repoId, settings: form })}
        >
          {saved ? "Save changes" : "Turn on booking"}
        </Button>
      </div>
    </div>
  );
}

// ─── Install snippet ─────────────────────────────────────────────

function BookingSnippet({ formKey }: { formKey: string }) {
  const snippet = `<script src="${API_URL}/b.js" data-key="${formKey}" defer></script>\n<button data-booking>Book an appointment</button>`;
  return (
    <FrameCard innerClassName="flex flex-col gap-3">
      <p className="text-[17px] font-semibold">Put booking on the website</p>
      <p className="text-muted-foreground text-[15px]">
        Add <code>data-booking</code> to any button or link on the site: the
        site keeps its own button styling, and clicking it opens the booking
        dialog on top of the page, booking straight into your calendar. Optional
        attributes on that element: <code>data-accent=&quot;#0f766e&quot;</code>{" "}
        recolors the dialog (the default is our orange),{" "}
        <code>data-theme=&quot;dark&quot;</code> makes it dark. If the capture
        script (f.js) is on the page too, bookings are credited to the ad that
        brought the visitor.
      </p>
      <div className="flex items-start gap-2">
        <code className="flex-1 rounded-[11px] bg-[#171512] p-4 text-[13px] whitespace-pre-wrap text-[#ece9e2]">
          {snippet}
        </code>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            navigator.clipboard
              .writeText(snippet)
              .then(() => toast.success("Copied."))
          }
        >
          Copy code
        </Button>
      </div>
    </FrameCard>
  );
}

// ─── Bookings list ───────────────────────────────────────────────

function BookingsCard({ repoId }: { repoId: number }) {
  const href = useAgencyHref();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const bookings = useQuery(trpc.agency.booking.list.queryOptions({ repoId }));
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: trpc.agency.booking.pathKey() });

  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Booking | null>(null);

  const setOutcome = useMutation(
    trpc.agency.booking.setOutcome.mutationOptions({
      onSuccess: refresh,
      onError: (error) => toast.error(error.message),
    })
  );

  if (bookings.isPending)
    return <Skeleton className="h-40 w-full rounded-[18px]" />;
  if (bookings.error) return null;

  const upcoming = bookings.data.filter(
    (b) => !b.bookingCanceledAt && b.bookingAt && new Date(b.bookingAt) >= new Date()
  );
  const past = bookings.data.filter(
    (b) => b.bookingCanceledAt || (b.bookingAt && new Date(b.bookingAt) < new Date())
  );

  if (!bookings.data.length) {
    return (
      <div className="ring-foreground/10 rounded-[18px] p-8 text-center ring-1 ring-dashed">
        <p className="text-[17px] font-semibold">No bookings yet</p>
        <p className="text-muted-foreground mt-1 text-[15px]">
          Appointments booked on your website appear here and in your leads,
          with where each one came from.
        </p>
      </div>
    );
  }

  const sections = [
    { label: "Upcoming", rows: [...upcoming].reverse() },
    { label: "Past", rows: past },
  ].filter((s) => s.rows.length);

  return (
    <div className="flex flex-col gap-5">
      {sections.map((section) => (
        <div
          key={section.label}
          className="bg-card ring-foreground/7 overflow-hidden rounded-[18px] shadow-[0_6px_16px_rgba(27,26,23,0.05)] ring-1"
        >
          <div className="border-foreground/7 flex items-center gap-2 border-b px-6 py-4">
            <span className="font-mono text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
              {section.label}
            </span>
            <span className="text-muted-foreground text-[13px]">
              · {section.rows.length}
            </span>
          </div>
          <div className="divide-foreground/7 divide-y">
            {section.rows.map((booking) => {
              const at = booking.bookingAt ? new Date(booking.bookingAt) : null;
              const canceled = Boolean(booking.bookingCanceledAt);
              const isPast = Boolean(at && at < new Date());
              return (
                <div
                  key={booking.id}
                  className={cn(
                    "flex flex-wrap items-center gap-4 px-6 py-4",
                    canceled && "opacity-55"
                  )}
                >
                  <div className="w-32 shrink-0">
                    <p className="font-medium">
                      {at ? format(at, "EEE, MMM d") : "–"}
                    </p>
                    <p className="text-muted-foreground text-[13px]">
                      {at ? format(at, "p") : ""}
                      {canceled ? " · Canceled" : ""}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <a
                      className="font-medium hover:underline"
                      href={href(`/agency/${booking.id}`)}
                    >
                      {booking.name ?? booking.email ?? "Visitor"}
                    </a>
                    <p className="text-muted-foreground truncate text-[13px]">
                      {booking.email}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1 text-[14px]">
                    <span>{booking.booking?.typeName}</span>
                    <span className="text-muted-foreground ml-2 inline-flex items-center gap-2 text-[13px]">
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
                        <span className="text-destructive">
                          Calendar event failed
                        </span>
                      )}
                    </span>
                  </div>
                  {!canceled && !isPast && (
                    <span className="flex gap-1.5">
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
                  {!canceled &&
                    isPast &&
                    (booking.bookingOutcome ? (
                      <button
                        type="button"
                        title="Click to undo"
                        disabled={setOutcome.isPending}
                        onClick={() =>
                          setOutcome.mutate({
                            repoId,
                            leadId: booking.id,
                            outcome: null,
                          })
                        }
                      >
                        <StatusPill
                          tone={
                            booking.bookingOutcome === "completed"
                              ? "success"
                              : "danger"
                          }
                        >
                          {booking.bookingOutcome === "completed"
                            ? "Completed"
                            : "No-show"}
                        </StatusPill>
                      </button>
                    ) : (
                      <span className="flex gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={setOutcome.isPending}
                          onClick={() =>
                            setOutcome.mutate({
                              repoId,
                              leadId: booking.id,
                              outcome: "completed",
                            })
                          }
                        >
                          Completed
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={setOutcome.isPending}
                          onClick={() =>
                            setOutcome.mutate({
                              repoId,
                              leadId: booking.id,
                              outcome: "no_show",
                            })
                          }
                        >
                          No-show
                        </Button>
                      </span>
                    ))}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {cancelTarget && (
        <CancelBookingDialog
          repoId={repoId}
          booking={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onDone={() => {
            setCancelTarget(null);
            refresh();
          }}
        />
      )}
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
