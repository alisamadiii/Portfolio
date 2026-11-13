"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { addMinutes, format, parse } from "date-fns";
import { toast } from "sonner";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";
import { useTRPC } from "@workspace/trpc/client";
import {
  BUSINESS_CONTACT_KEYS,
  placeholderValues,
  resolveTemplate,
} from "@workspace/trpc/lib/templates-shared";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import { writableCalendars } from "@/components/calendar/new-event-dialog";
import { Button } from "@/components/ds/ui/button";
import { DatePicker } from "@/components/ds/ui/date-picker";
import { Field, Input, Select } from "@/components/ds/ui/field";
import { TemplateTextarea } from "@/components/templates/template-textarea";
import { useProject } from "@/hooks/use-project";
import { handleCmsError } from "@/lib/trpc-errors";

type Lead = RouterOutputs["agency"]["leads"]["get"];

const DURATIONS = [15, 30, 45, 60, 90, 120];

const TIMES = Array.from({ length: 96 }, (_, i) => {
  const value = `${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`;
  return { value, label: format(parse(value, "HH:mm", new Date()), "h:mm a") };
});

const nextHour = () => {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
};

/**
 * Book (or reschedule) an appointment for a lead on the project's Google
 * Calendar. Appointment templates pre-fill it; [[placeholders]] show filled
 * in the preview and are filled for real on the server.
 */
export function ScheduleMeetingDialog({
  projectId,
  lead,
  onClose,
  onDone,
}: {
  projectId: string;
  lead: Lead;
  onClose: () => void;
  onDone: (updated: Lead) => void;
}) {
  const trpc = useTRPC();
  const websiteUrl = useProject()?.websiteUrl ?? null;
  const myName = useCurrentUser().data?.user?.name ?? null;
  const calendars = useQuery(trpc.gcal.calendars.queryOptions({ projectId }));
  const templates = useQuery(trpc.agency.templates.list.queryOptions({ projectId }));
  const businessInfo = useQuery(trpc.agency.businessInfo.get.queryOptions({ projectId }));

  const writable = writableCalendars(calendars.data ?? []);
  const appointments = (templates.data ?? []).filter((t) => t.kind === "appointment");
  const snippets = (templates.data ?? []).filter((t) => t.kind === "text");
  const hasAddress = !!businessInfo.data?.[BUSINESS_CONTACT_KEYS.address]?.[0];

  const rescheduling = !!lead.meetingAt;
  const initialStart = lead.meetingAt ? new Date(lead.meetingAt) : nextHour();
  const initialLength =
    lead.meetingAt && lead.meetingEndAt
      ? Math.round((new Date(lead.meetingEndAt).getTime() - new Date(lead.meetingAt).getTime()) / 60000)
      : 30;

  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState(lead.name ? "Meeting with [[lead name]]" : "Meeting");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<string | null>(null);
  const [date, setDate] = useState(format(initialStart, "yyyy-MM-dd"));
  const [time, setTime] = useState(format(initialStart, "HH:mm"));
  const [length, setLength] = useState(DURATIONS.includes(initialLength) ? initialLength : 30);
  const [calendarId, setCalendarId] = useState(lead.meetingCalendarId ?? "");
  const [notifyLead, setNotifyLead] = useState(true);

  // Defaults that wait for data: the address as location, the main calendar.
  const locationValue = location ?? (hasAddress ? "[[business address]]" : "");
  const calendarValue = calendarId || writable[0]?.id || "";

  const start = parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", new Date());
  const end = addMinutes(start, length);
  const inPast = start < new Date();

  const values = placeholderValues({
    lead,
    businessInfo: businessInfo.data,
    websiteUrl,
    myName,
    meetingStart: start,
  });
  const preview = {
    title: resolveTemplate(title, values),
    description: resolveTemplate(description, values),
    location: resolveTemplate(locationValue, values),
  };
  const missing = [
    ...new Set([...preview.title.missing, ...preview.description.missing, ...preview.location.missing]),
  ];

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = appointments.find((a) => String(a.id) === id);
    if (!t) return;
    if (t.title) setTitle(t.title);
    setDescription(t.body);
    if (t.durationMinutes && DURATIONS.includes(t.durationMinutes)) setLength(t.durationMinutes);
  };

  const schedule = useMutation(
    trpc.agency.leads.scheduleMeeting.mutationOptions({
      onSuccess: (updated) => {
        toast.success(
          notifyLead && lead.email ? `Scheduled. Invite sent to ${lead.email}.` : "Scheduled on Google Calendar."
        );
        onDone(updated);
      },
      onError: (e) => toast.error(handleCmsError(e, "Couldn't schedule the meeting.")),
    })
  );

  const ready = title.trim() && calendarValue && !inPast && !schedule.isPending;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{rescheduling ? "Reschedule" : "Schedule"} with {lead.name || lead.email || "this lead"}</DialogTitle>
          <DialogDescription>Booked on your Google Calendar.</DialogDescription>
        </DialogHeader>
        <form
          id="schedule-meeting"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!ready) return;
            schedule.mutate({
              projectId,
              id: lead.id,
              calendarId: calendarValue,
              start: start.toISOString(),
              end: end.toISOString(),
              title: title.trim(),
              description: description.trim() || undefined,
              location: locationValue.trim() || undefined,
              notifyLead: notifyLead && !!lead.email,
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            });
          }}
        >
          {appointments.length > 0 && (
            <Field label="Template" optional>
              <Select value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
                <option value="">None</option>
                {appointments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </Field>
          <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-3">
            <Field label="Date">
              <DatePicker aria-label="Date" value={date} min={format(new Date(), "yyyy-MM-dd")} onChange={setDate} />
            </Field>
            <Field label="Time">
              <Select value={time} onChange={(e) => setTime(e.target.value)}>
                {!TIMES.some((t) => t.value === time) && <option value={time}>{time}</option>}
                {TIMES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Length">
              <Select value={length} onChange={(e) => setLength(Number(e.target.value))}>
                {DURATIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {writable.length > 1 && (
            <Field label="Calendar">
              <Select value={calendarValue} onChange={(e) => setCalendarId(e.target.value)}>
                {writable.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Location" optional>
            <Input
              value={locationValue}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Address, phone or video link"
              maxLength={500}
            />
          </Field>
          <Field label="Description" optional hint="Type [[ for placeholders, / for snippets.">
            <TemplateTextarea
              value={description}
              onValueChange={setDescription}
              snippets={snippets}
              rows={4}
              maxLength={5000}
            />
          </Field>
          {lead.email && (
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={notifyLead}
                onChange={(e) => setNotifyLead(e.target.checked)}
                className="size-4 accent-coral"
              />
              Email {lead.email} an invite
            </label>
          )}

          {/* What the event will say once placeholders are filled. */}
          <div className="flex flex-col gap-1 rounded-control border border-line bg-sidebar px-3 py-2.5 text-[13px]">
            <span className="font-semibold text-ink">{preview.title.text || "—"}</span>
            <span className="text-dim">
              {format(start, "EEEE, MMMM d")} · {format(start, "h:mm a")} – {format(end, "h:mm a")}
              {preview.location.text && ` · ${preview.location.text}`}
            </span>
            {preview.description.text && (
              <span className="mt-1 line-clamp-4 whitespace-pre-wrap text-ink-3">{preview.description.text}</span>
            )}
            {missing.length > 0 && (
              <span className="mt-1 text-[12px] text-coral-text">
                No value yet for {missing.map((m) => `[[${m}]]`).join(", ")}. It stays as typed.
              </span>
            )}
          </div>
          {inPast && <p className="text-[13px] text-danger">Pick a time in the future.</p>}
        </form>
        <DialogFooter>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="schedule-meeting" variant="primary" disabled={!ready}>
            {schedule.isPending
              ? "Scheduling…"
              : notifyLead && lead.email
                ? `${rescheduling ? "Reschedule" : "Schedule"} and send invite`
                : rescheduling
                  ? "Reschedule"
                  : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
