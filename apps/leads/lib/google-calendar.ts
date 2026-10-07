import { authClient } from "@workspace/auth/auth-client";

export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

/**
 * Kick off the Google Calendar consent flow. On success the browser navigates
 * away to Google and returns to callbackURL, so callers only ever see the
 * error half of the result.
 */
export async function connectGoogleCalendar(callbackURL: string) {
  const result = await authClient.linkSocial({
    provider: "google",
    scopes: [CALENDAR_SCOPE],
    callbackURL,
  });
  return result.error ? { message: result.error.message } : null;
}
