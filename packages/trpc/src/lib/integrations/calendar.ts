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
