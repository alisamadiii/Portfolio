// ─── Hub view preference ─────────────────────────────────────────
// The hub has two UIs: the lead-gen agency one and the plain website one.
// Which one an eligible user sees is their choice, stored in a cookie. A user
// who is not an agency client always gets the website UI and never a choice.

export const HUB_VIEW_COOKIE = "hub-view";

export type HubView = "agency" | "website";

/**
 * The view to render: website for anyone who isn't an agency client; for an
 * agency client, their cookie choice, defaulting to agency (what they got
 * before the toggle existed).
 */
export function resolveHubView(
  eligible: boolean,
  cookieValue: string | undefined
): HubView {
  if (!eligible) return "website";
  return cookieValue === "website" ? "website" : "agency";
}
