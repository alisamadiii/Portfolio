"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addHours, format, parse } from "date-fns";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import { Button } from "@/components/ds/ui/button";
import { DatePicker } from "@/components/ds/ui/date-picker";
import { Field, Input, Select } from "@/components/ds/ui/field";
import { TemplateTextarea } from "@/components/templates/template-textarea";
import { handleCmsError } from "@/lib/trpc-errors";

type Calendar = RouterOutputs["gcal"]["calendars"][number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Every quarter hour of the day: "HH:mm" values, "9:15 AM" labels.
const TIMES = Array.from({ length: 96 }, (_, i) => {
  const value = `${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`;
  return { value, label: format(parse(value, "HH:mm", new Date()), "h:mm a") };
});

/** Quarter-hour select; an off-grid value (e.g. 9:10) stays listed. */
function TimeSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const options = TIMES.some((t) => t.value === value)
    ? TIMES
    : [{ value, label: format(parse(value, "HH:mm", new Date()), "h:mm a") }, ...TIMES];
  return (
    <Select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((t) => (
        <option key={t.value} value={t.value}>
          {t.label}
        </option>
      ))}
    </Select>
  );
}

/** Calendars the account may add events to. */
export const writableCalendars = (calendars: Calendar[]) =>
  calendars.filter((c) => c.accessRole === "owner" || c.accessRole === "writer");

/**
 * Create a Google Calendar event. Submitting is the confirmation: the button
 * says when guests will be emailed. Remounted per open (keyed by the caller),
 * so every open starts from the clicked time.
 */
export function NewEventDialog({
  projectId,
  calendars,
  defaultCalendarId,
  start: initialStart,
  open,
  onOpenChange,
}: {
  projectId: string;
  calendars: Calendar[];
  defaultCalendarId?: string;
  /** Pre-filled start (clicked slot), else the next full hour. */
  start: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const options = writableCalendars(calendars);
  // "/" snippets (projects without Leads have none: the query just fails).
  const templates = useQuery(
    trpc.agency.templates.list.queryOptions({ projectId }, { retry: false })
  );
  const snippets = (templates.data ?? []).filter((t) => t.kind === "text");

  const [title, setTitle] = useState("");
  const [calendarId, setCalendarId] = useState(
    options.find((c) => c.id === defaultCalendarId)?.id ?? options[0]?.id ?? ""
  );
  const [allDay, setAllDay] = useState(false);
  const [date, setDate] = useState(format(initialStart, "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(initialStart, "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(format(initialStart, "HH:mm"));
  const [endTime, setEndTime] = useState(format(addHours(initialStart, 1), "HH:mm"));
  const [location, setLocation] = useState("");
  const [guestsRaw, setGuestsRaw] = useState("");
  const [description, setDescription] = useState("");
  const [notifyGuests, setNotifyGuests] = useState(true);

  const guests = Array.from(
    new Set(guestsRaw.split(/[\s,;]+/).map((g) => g.trim().toLowerCase()).filter(Boolean))
  );
  const badGuests = guests.filter((g) => !EMAIL_RE.test(g));

  const startAt = parse(`${date} ${startTime}`, "yyyy-MM-dd HH:mm", new Date());
  const endAt = parse(`${date} ${endTime}`, "yyyy-MM-dd HH:mm", new Date());
  const error =
    badGuests.length > 0
      ? `Not an email: ${badGuests.join(", ")}`
      : allDay
        ? endDate < date
          ? "The event must end on or after its start date."
          : null
        : !(endAt > startAt)
          ? "The event must end after it starts."
          : null;

  const create = useMutation(
    trpc.gcal.createEvent.mutationOptions({
      onSuccess: () => {
        toast.success(guests.length && notifyGuests ? "Event created. Invites sent." : "Event created.");
        void queryClient.invalidateQueries({ queryKey: trpc.gcal.events.pathKey() });
        onOpenChange(false);
      },
      onError: (e) => toast.error(handleCmsError(e, "Couldn't create the event.")),
    })
  );

  const submit = () => {
    if (!title.trim() || !calendarId || error) return;
    create.mutate({
      projectId,
      calendarId,
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      allDay,
      // All-day end dates are exclusive in Google Calendar.
      start: allDay ? date : startAt.toISOString(),
      end: allDay
        ? format(addDays(parse(endDate, "yyyy-MM-dd", new Date()), 1), "yyyy-MM-dd")
        : endAt.toISOString(),
      guests,
      notifyGuests: guests.length > 0 && notifyGuests,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>New event</DialogTitle>
          <DialogDescription>Added straight to Google Calendar.</DialogDescription>
        </DialogHeader>
        <form
          id="new-event"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Field label="Title">
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Consultation with Sarah"
              maxLength={200}
            />
          </Field>
          {options.length > 1 && (
            <Field label="Calendar">
              <Select value={calendarId} onChange={(e) => setCalendarId(e.target.value)}>
                {options.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="size-4 accent-coral"
            />
            All day
          </label>
          {allDay ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts">
                <DatePicker aria-label="Start date" value={date} onChange={setDate} />
              </Field>
              <Field label="Ends">
                <DatePicker aria-label="End date" value={endDate} min={date} onChange={setEndDate} />
              </Field>
            </div>
          ) : (
            <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-3">
              <Field label="Date">
                <DatePicker aria-label="Date" value={date} onChange={setDate} />
              </Field>
              <Field label="From">
                <TimeSelect label="Start time" value={startTime} onChange={setStartTime} />
              </Field>
              <Field label="To">
                <TimeSelect label="End time" value={endTime} onChange={setEndTime} />
              </Field>
            </div>
          )}
          <Field label="Location" optional>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={500} />
          </Field>
          <Field label="Guests" optional hint="Emails, separated by commas.">
            <Input
              value={guestsRaw}
              onChange={(e) => setGuestsRaw(e.target.value)}
              placeholder="name@example.com"
              autoComplete="off"
            />
          </Field>
          {guests.length > 0 && (
            <label className="-mt-2 flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={notifyGuests}
                onChange={(e) => setNotifyGuests(e.target.checked)}
                className="size-4 accent-coral"
              />
              Email the guests an invite
            </label>
          )}
          <Field label="Description" optional>
            <TemplateTextarea
              value={description}
              onValueChange={setDescription}
              snippets={snippets}
              placeholders={false}
              maxLength={5000}
            />
          </Field>
          {error && <p className="text-[13px] text-danger">{error}</p>}
        </form>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            type="submit"
            form="new-event"
            variant="primary"
            disabled={!title.trim() || !calendarId || !!error || create.isPending}
          >
            {create.isPending
              ? "Creating…"
              : guests.length && notifyGuests
                ? "Create and send invites"
                : "Create event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
