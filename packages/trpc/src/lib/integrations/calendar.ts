import "server-only";

import { TRPCError } from "@trpc/server";

import { getIntegrationAccessToken, reconnectError } from "./index";

// ─── Google Calendar integration ─────────────────────────────────
// Meeting scheduling for the leads app. Events are created on the connecting
// user's `primary` calendar via the OAuth token Better Auth stored when the
// calendar.events scope was granted. No SDK — raw fetch, same pattern as the
// Google Analytics integration.

const CAL_BASE = "https://www.googleapis.com/calendar/v3/calendars/primary";

/** The connected Google token is missing/expired/unscoped — the UI must prompt a reconnect. */
const RECONNECT = () => reconnectError("Google Calendar");

const getCalendarAccessToken = (userId: string) =>
  getIntegrationAccessToken(userId, "google-calendar", "Google Calendar");

// 401 = dead token → reconnect. 403 is ambiguous: insufficient scope →
// reconnect, but "Calendar API not enabled on the project" is also a 403 —
// that one must surface Google's message, not a misleading reconnect prompt.
async function throwCalendarError(res: Response): Promise<never> {
  const detail = await res.text().catch(() => "");
  if (
    res.status === 401 ||
    (res.status === 403 && /insufficient|scope/i.test(detail))
  ) {
    throw RECONNECT();
  }
  throw new TRPCError({
    code: "BAD_GATEWAY",
    message: `Google Calendar API error (${res.status}): ${detail.slice(0, 300)}`,
  });
}

async function cal<T>(
  url: string,
  accessToken: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) await throwCalendarError(res);
  // DELETE returns an empty body.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type LeadMeetingInput = {
  userId: string;
  summary: string;
  description: string;
  location: string | null;
  startISO: string;
  endISO: string;
  attendeeEmail: string;
};

/**
 * Create an event on the user's primary calendar and email an invite to the
 * attendee (sendUpdates=all). Popup reminder 30 minutes before.
 */
export async function createLeadMeeting(
  input: LeadMeetingInput
): Promise<{ id: string; htmlLink: string | null }> {
  const token = await getCalendarAccessToken(input.userId);
  const event = await cal<{ id?: string; htmlLink?: string }>(
    `${CAL_BASE}/events?sendUpdates=all`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        location: input.location ?? undefined,
        start: { dateTime: input.startISO },
        end: { dateTime: input.endISO },
        attendees: [{ email: input.attendeeEmail }],
        reminders: {
          useDefault: false,
          overrides: [{ method: "popup", minutes: 30 }],
        },
      }),
    }
  );
  if (!event.id) {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "Google Calendar did not return an event id.",
    });
  }
  return { id: event.id, htmlLink: event.htmlLink ?? null };
}

/** Delete an event, emailing attendees. Already-gone events are a success. */
export async function deleteLeadMeeting(input: {
  userId: string;
  eventId: string;
}): Promise<void> {
  const token = await getCalendarAccessToken(input.userId);
  const res = await fetch(
    `${CAL_BASE}/events/${encodeURIComponent(input.eventId)}?sendUpdates=all`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );
  // 404/410 = event already deleted (e.g. removed in Google Calendar itself).
  if (res.ok || res.status === 404 || res.status === 410) return;
  await throwCalendarError(res);
}

// ─── Project Google Calendar app (read-only dashboard) ───────────
// The calendar list + events of the Google account bound to the project
// (hub_project.gcalConnectedUserId + gcalAccountId), full calendar scope.

const API = "https://www.googleapis.com/calendar/v3";

export const gcalTokenFor = (userId: string, accountId: string) =>
  getIntegrationAccessToken(userId, "gcal", "Google Calendar", accountId);

type GoogleCalendarListEntry = {
  id: string;
  summary?: string;
  summaryOverride?: string;
  description?: string;
  backgroundColor?: string;
  primary?: boolean;
  accessRole?: string;
  timeZone?: string;
  selected?: boolean;
};

export async function listCalendars(token: string) {
  const data = await cal<{ items?: GoogleCalendarListEntry[] }>(
    `${API}/users/me/calendarList?maxResults=250`,
    token
  );
  return (data.items ?? []).map((c) => ({
    id: c.id,
    name: c.summaryOverride ?? c.summary ?? c.id,
    description: c.description ?? null,
    color: c.backgroundColor ?? null,
    primary: !!c.primary,
    accessRole: c.accessRole ?? null,
    timeZone: c.timeZone ?? null,
  }));
}

type GoogleEvent = {
  id: string;
  status?: string;
  summary?: string;
  location?: string;
  htmlLink?: string;
  hangoutLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { email?: string; displayName?: string; responseStatus?: string }[];
  colorId?: string;
};

/** Events overlapping [from, to), recurring ones expanded, cancelled dropped. */
export async function listEvents(token: string, calendarId: string, from: string, to: string) {
  const items: GoogleEvent[] = [];
  let pageToken: string | undefined;
  // A week rarely needs more than one page; cap the walk anyway.
  for (let page = 0; page < 5; page++) {
    const params = new URLSearchParams({
      timeMin: from,
      timeMax: to,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const data = await cal<{ items?: GoogleEvent[]; nextPageToken?: string }>(
      `${API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      token
    );
    items.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return items
    .filter((e) => e.status !== "cancelled")
    .map((e) => ({
      id: e.id,
      title: e.summary ?? "(No title)",
      location: e.location ?? null,
      link: e.htmlLink ?? null,
      meetLink: e.hangoutLink ?? null,
      allDay: !e.start?.dateTime,
      // All-day events carry dates ("2026-11-13"); timed ones full ISO.
      start: e.start?.dateTime ?? e.start?.date ?? "",
      end: e.end?.dateTime ?? e.end?.date ?? "",
      attendees: (e.attendees ?? [])
        .filter((a) => a.email)
        .map((a) => ({ email: a.email!, name: a.displayName ?? null, response: a.responseStatus ?? null })),
    }));
}

/** The Google account's email (userinfo), for the "Connected as" line. */
export async function googleAccountEmail(token: string): Promise<string | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { email?: string };
  return data.email ?? null;
}
