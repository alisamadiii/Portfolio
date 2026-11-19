// Shared by the hub page (client bundle) and the router's zod schema. Keep
// this file free of node imports.

/** How long a pause lasts; "today" = until the store's local midnight. */
export const PAUSE_CHOICES = ["30m", "1h", "2h", "today", "indefinite"] as const;
export type PauseChoice = (typeof PAUSE_CHOICES)[number];

/** Uber's deny reason codes (deny_pos_order), with the words staff see. */
export const DENY_REASONS = [
  { code: "ITEM_AVAILABILITY", label: "Item not available" },
  { code: "CAPACITY", label: "Kitchen too busy" },
  { code: "STORE_CLOSED", label: "Store is closed" },
  { code: "PRICING", label: "Pricing problem" },
  { code: "SPECIAL_INSTRUCTIONS", label: "Can't do the special request" },
  { code: "ADDRESS", label: "Address problem" },
  { code: "MISSING_INFO", label: "Missing information" },
  { code: "OTHER", label: "Other" },
] as const;
export type DenyCode = (typeof DENY_REASONS)[number]["code"];
export const DENY_CODES = DENY_REASONS.map((r) => r.code) as [DenyCode, ...DenyCode[]];

/** Uber cancels a new order the restaurant hasn't accepted after this long. */
export const ACCEPT_WINDOW_MS = 11.5 * 60_000;
