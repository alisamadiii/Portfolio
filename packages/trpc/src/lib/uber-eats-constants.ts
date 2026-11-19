// Shared by the hub page (client bundle) and the router's zod schema. Keep
// this file free of node imports.

/** How long a pause lasts; "today" = until the store's local midnight. */
export const PAUSE_CHOICES = ["30m", "1h", "2h", "today", "indefinite"] as const;
export type PauseChoice = (typeof PAUSE_CHOICES)[number];
