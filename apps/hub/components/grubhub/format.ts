import { CONFIRM_WINDOW_MS } from "@workspace/trpc/lib/grubhub-constants";

export { FULFILLMENT_LABELS, STATUS_META } from "@workspace/trpc/lib/grubhub-constants";
export { itemsSummary, localTime, money } from "@/components/uber-eats/format";

// How a Grubhub order reads on screen; the app page, the order dialog, the
// Orders page and Home all import from here.

/** "m:ss" left before Grubhub cancels an unconfirmed order, and the raw remainder. */
export function confirmCountdown(placedAt: string, now: number) {
  const remaining = Math.max(0, new Date(placedAt).getTime() + CONFIRM_WINDOW_MS - now);
  const m = Math.floor(remaining / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);
  return { remaining, label: `${m}:${String(s).padStart(2, "0")}` };
}
