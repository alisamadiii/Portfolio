import "server-only";

import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";

import { reconnectError } from "./index";

// ─── Google Calendar actions for Flows (automations) ─────────────
// Flows workflows book, list, cancel and find free time on the project's
// connected calendar (hub_project.gcal*) through the flowsService router.
// Params arrive as strings (rendered workflow templates), so every value is
// parsed and validated here. Raw fetch, same as the rest of calendar.ts.

const API = "https://www.googleapis.com/calendar/v3";

export type FlowsParams = Record<string, string | undefined>;

type ActionContext = {
  token: string;
  params: FlowsParams;
  // Stable per project + workflow run + node: a retry never books twice.
  idempotencyKey: string;
};

const bad = (message: string) => new TRPCError({ code: "BAD_REQUEST", message });

async function google(
  token: string,
  path: string,
  init: { method?: string; body?: unknown; query?: Record<string, string> } = {}
) {
  const url = new URL(`${API}${path}`);
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = {};
  }
  return { status: res.status, ok: res.ok, json };
}

function fail(status: number, json: Record<string, unknown>, what: string): never {
  const message = (json.error as { message?: string } | undefined)?.message;
  if (status === 401 || (status === 403 && /insufficient|scope/i.test(message ?? ""))) {
    throw reconnectError("Google Calendar");
  }
  throw new TRPCError({
    code: "BAD_GATEWAY",
    message: `Google Calendar could not ${what} (${status})${message ? `: ${message}` : ""}`,
  });
}

// ─── Time helpers ─────────────────────────────────────────────────

const num = (v: string | undefined, fallback: number, min: number, max: number) => {
  const n = Number(v);
  return v !== undefined && v !== "" && Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
};
const bool = (v: string | undefined, fallback: boolean) =>
  v === undefined || v === "" ? fallback : v === "true" || v === "1";
const hasOffset = (s: string) => /([zZ]|[+-]\d{2}:?\d{2})$/.test(s);

// "now", "+7 days", "+3h", or an ISO date/time.
function parseWhen(raw: string | undefined, fallback: Date, base = new Date()): Date {
  const v = (raw ?? "").trim();
  if (!v || v === "now") return v === "now" ? base : fallback;
  const rel = v.match(/^\+?\s*(\d+)\s*(minutes?|mins?|m|hours?|h|days?|d|weeks?|w)$/i);
  if (rel) {
    const n = Number(rel[1]);
    const unit = rel[2][0].toLowerCase();
    const ms = unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : unit === "d" ? 86_400_000 : 604_800_000;
    return new Date(base.getTime() + n * ms);
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw bad(`"${v}" is not a date/time`);
  return d;
}

// Minutes east of UTC for a zone at an instant.
function tzOffsetMinutes(at: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - at.getTime()) / 60_000);
}

// Wall-clock time in a zone → instant.
function zoned(y: number, m: number, d: number, hh: number, mm: number, timeZone: string) {
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let t = guess - tzOffsetMinutes(new Date(guess), timeZone) * 60_000;
  t = guess - tzOffsetMinutes(new Date(t), timeZone) * 60_000;
  return new Date(t);
}

function ymdIn(at: Date, timeZone: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" })
      .formatToParts(at)
      .map((x) => [x.type, x.value])
  );
  return { y: +p.year, m: +p.month, d: +p.day, weekday: String(p.weekday).toLowerCase().slice(0, 3) };
}

const hm = (v: string | undefined, fallback: string) => {
  const s = (v || fallback).trim();
  const match = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) throw bad(`"${s}" is not a time like 09:00`);
  return { h: Number(match[1]), m: Number(match[2]) };
};

function validZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

async function calendarZone(ctx: ActionContext, calendarId: string) {
  const explicit = ctx.params.timezone?.trim();
  if (explicit) {
    if (!validZone(explicit)) throw bad(`Unknown time zone "${explicit}"`);
    return explicit;
  }
  const res = await google(ctx.token, `/users/me/calendarList/${encodeURIComponent(calendarId)}`);
  const zone = typeof res.json.timeZone === "string" ? res.json.timeZone : "UTC";
  return validZone(zone) ? zone : "UTC";
}

const calendarOf = (ctx: ActionContext) => ctx.params.calendarId?.trim() || "primary";

type GEvent = {
  id: string;
  summary?: string;
  status?: string;
  transparency?: string;
  htmlLink?: string;
  hangoutLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { email?: string; displayName?: string; responseStatus?: string }[];
};

async function eventsBetween(ctx: ActionContext, calendarId: string, from: Date, to: Date) {
  const events: GEvent[] = [];
  let pageToken: string | undefined;
  do {
    const res = await google(ctx.token, `/calendars/${encodeURIComponent(calendarId)}/events`, {
      query: {
        timeMin: from.toISOString(),
        timeMax: to.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "250",
        ...(pageToken ? { pageToken } : {}),
      },
    });
    if (!res.ok) fail(res.status, res.json, "read the calendar");
    events.push(...((res.json.items as GEvent[]) ?? []));
    pageToken = res.json.nextPageToken as string | undefined;
  } while (pageToken && events.length < 2000);
  return events.filter((e) => e.status !== "cancelled");
}

const startOf = (e: GEvent) => new Date(e.start?.dateTime ?? `${e.start?.date}T00:00:00Z`);
const endOf = (e: GEvent) => new Date(e.end?.dateTime ?? `${e.end?.date}T00:00:00Z`);

// ─── Actions ──────────────────────────────────────────────────────

async function findFreeSlots(ctx: ActionContext) {
  const calendarId = calendarOf(ctx);
  const zone = await calendarZone(ctx, calendarId);
  const now = new Date();
  const from = parseWhen(ctx.params.from, now);
  const to = parseWhen(ctx.params.to, new Date(from.getTime() + 7 * 86_400_000), from);
  if (to <= from) throw bad('"To" must be after "From"');
  if (to.getTime() - from.getTime() > 62 * 86_400_000) throw bad("Search at most 62 days at a time");
  const duration = num(ctx.params.durationMinutes, 30, 5, 600);
  const limit = num(ctx.params.limit, 10, 1, 100);
  const dayStart = hm(ctx.params.dayStart, "09:00");
  const dayEnd = hm(ctx.params.dayEnd, "17:00");
  const days = (ctx.params.days || "mon,tue,wed,thu,fri")
    .toLowerCase()
    .split(/[\s,]+/)
    .map((d) => d.slice(0, 3))
    .filter(Boolean);

  const busy = (await eventsBetween(ctx, calendarId, from, to))
    .filter((e) => e.transparency !== "transparent")
    .map((e) => [startOf(e).getTime(), endOf(e).getTime()] as const);

  const slots: { start: string; end: string }[] = [];
  const step = Math.min(duration, 30) * 60_000;
  for (let day = new Date(from); day < to && slots.length < limit; day = new Date(day.getTime() + 86_400_000)) {
    const { y, m, d, weekday } = ymdIn(day, zone);
    if (!days.includes(weekday)) continue;
    const winStart = zoned(y, m, d, dayStart.h, dayStart.m, zone).getTime();
    const winEnd = zoned(y, m, d, dayEnd.h, dayEnd.m, zone).getTime();
    for (let s = winStart; s + duration * 60_000 <= winEnd && slots.length < limit; s += step) {
      const e = s + duration * 60_000;
      if (s < Math.max(from.getTime(), now.getTime()) || e > to.getTime()) continue;
      if (busy.some(([bs, be]) => s < be && e > bs)) continue;
      if (slots.some((x) => new Date(x.start).getTime() === s)) continue;
      slots.push({ start: new Date(s).toISOString(), end: new Date(e).toISOString() });
    }
  }
  return { timezone: zone, durationMinutes: duration, slots, first: slots[0] ?? null, count: slots.length };
}

// Google event ids: base32hex (0-9, a-v), 5-1024 chars.
function eventIdFor(key: string) {
  const digest = createHash("sha256").update(`flows:${key}`).digest();
  const alphabet = "0123456789abcdefghijklmnopqrstuv";
  let out = "";
  for (const byte of digest) out += alphabet[byte & 31];
  return out;
}

function addMinutes(start: string, minutes: number) {
  if (hasOffset(start)) return new Date(new Date(start).getTime() + minutes * 60_000).toISOString();
  // Wall-clock time (interpreted in timeZone by Google): add on the wall clock.
  const base = new Date(`${start.length === 16 ? `${start}:00` : start}Z`);
  if (Number.isNaN(base.getTime())) throw bad(`"${start}" is not a date/time`);
  return new Date(base.getTime() + minutes * 60_000).toISOString().replace(".000Z", "");
}

async function createEvent(ctx: ActionContext) {
  const calendarId = calendarOf(ctx);
  const title = ctx.params.title?.trim();
  const start = ctx.params.start?.trim();
  if (!title) throw bad("A title is required");
  if (!start || Number.isNaN(new Date(hasOffset(start) ? start : `${start}Z`).getTime())) {
    throw bad(`Start "${start ?? ""}" is not a date/time`);
  }
  const zone = await calendarZone(ctx, calendarId);
  const duration = num(ctx.params.durationMinutes, 30, 5, 24 * 60);
  const end = addMinutes(start, duration);
  const id = eventIdFor(ctx.idempotencyKey);
  const guestEmail = ctx.params.guestEmail?.trim();
  if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) throw bad(`"${guestEmail}" is not an email address`);
  const notify = bool(ctx.params.notifyGuests, true);
  const meet = bool(ctx.params.addMeet, false);

  const body: Record<string, unknown> = {
    id,
    summary: title,
    description: ctx.params.description || undefined,
    location: ctx.params.location || undefined,
    start: { dateTime: start, timeZone: zone },
    end: { dateTime: end, timeZone: zone },
    attendees: guestEmail ? [{ email: guestEmail, displayName: ctx.params.guestName || undefined }] : undefined,
    extendedProperties: { private: { createdBy: "flows" } },
  };
  if (meet) body.conferenceData = { createRequest: { requestId: id, conferenceSolutionKey: { type: "hangoutsMeet" } } };

  let res = await google(ctx.token, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    body,
    query: { sendUpdates: notify ? "all" : "none", ...(meet ? { conferenceDataVersion: "1" } : {}) },
  });
  let reused = false;
  if (res.status === 409) {
    // Same run + node already booked it (a retry): return that event.
    res = await google(ctx.token, `/calendars/${encodeURIComponent(calendarId)}/events/${id}`);
    reused = true;
  }
  if (!res.ok) fail(res.status, res.json, "create the event");
  const e = res.json as GEvent;
  return {
    eventId: e.id,
    link: e.htmlLink ?? null,
    meetLink: e.hangoutLink ?? null,
    start: e.start?.dateTime ?? e.start?.date ?? start,
    end: e.end?.dateTime ?? e.end?.date ?? end,
    timezone: zone,
    guest: guestEmail ? { email: guestEmail, name: ctx.params.guestName || null } : null,
    alreadyExisted: reused,
  };
}

async function listEvents(ctx: ActionContext) {
  const calendarId = calendarOf(ctx);
  const from = parseWhen(ctx.params.from, new Date());
  const to = parseWhen(ctx.params.to, new Date(from.getTime() + 7 * 86_400_000), from);
  if (to <= from) throw bad('"To" must be after "From"');
  if (to.getTime() - from.getTime() > 62 * 86_400_000) throw bad("List at most 62 days at a time");
  const events = await eventsBetween(ctx, calendarId, from, to);
  return {
    count: events.length,
    events: events.map((e) => ({
      id: e.id,
      title: e.summary ?? "(no title)",
      start: e.start?.dateTime ?? e.start?.date,
      end: e.end?.dateTime ?? e.end?.date,
      link: e.htmlLink ?? null,
      guests: (e.attendees ?? []).map((a) => ({ email: a.email, name: a.displayName ?? null, response: a.responseStatus })),
    })),
  };
}

async function cancelEvent(ctx: ActionContext) {
  const eventId = ctx.params.eventId?.trim();
  if (!eventId) throw bad("An event id is required");
  const res = await google(
    ctx.token,
    `/calendars/${encodeURIComponent(calendarOf(ctx))}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE", query: { sendUpdates: bool(ctx.params.notifyGuests, true) ? "all" : "none" } }
  );
  if (res.status === 410 || res.status === 404) return { cancelled: true, alreadyGone: true };
  if (!res.ok) fail(res.status, res.json, "cancel the event");
  return { cancelled: true };
}

/** Calendars the account can write to; the primary one is reported as "primary". */
export async function writableCalendars(token: string) {
  const res = await google(token, "/users/me/calendarList", { query: { minAccessRole: "writer" } });
  if (!res.ok) fail(res.status, res.json, "list calendars");
  return ((res.json.items as { id: string; summary?: string; primary?: boolean; timeZone?: string }[]) ?? []).map(
    (c) => ({
      id: c.primary ? "primary" : c.id,
      name: c.summary ?? c.id,
      primary: Boolean(c.primary),
      timeZone: c.timeZone ?? null,
    })
  );
}

export const FLOWS_CALENDAR_ACTIONS = {
  find_free_slots: findFreeSlots,
  create_event: createEvent,
  list_events: listEvents,
  cancel_event: cancelEvent,
} as const;

export type FlowsCalendarAction = keyof typeof FLOWS_CALENDAR_ACTIONS;

export function runFlowsCalendarAction(
  action: FlowsCalendarAction,
  ctx: { token: string; projectId: string; params: FlowsParams; idempotencyKey: string }
) {
  return FLOWS_CALENDAR_ACTIONS[action]({
    token: ctx.token,
    params: ctx.params,
    // Scoped to the project so two projects can never collide on an event id.
    idempotencyKey: `${ctx.projectId}:${ctx.idempotencyKey}`,
  });
}
