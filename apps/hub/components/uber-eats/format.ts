import { parseISO } from "date-fns";

import type { UberOrderState, UberOrderType } from "@workspace/drizzle/schema";

import type { BadgeTone } from "@/components/ds/ui/badge";

// One place for how an Uber Eats order reads on screen: the app page, the
// order dialog, the Orders page and Home all import these.

export const STATE_LABELS: Record<UberOrderState, { label: string; tone: BadgeTone }> = {
  CREATED: { label: "New", tone: "coral" },
  ACCEPTED: { label: "In progress", tone: "info" },
  FINISHED: { label: "Completed", tone: "success" },
  CANCELED: { label: "Canceled", tone: "neutral" },
  DENIED: { label: "Denied", tone: "neutral" },
  UNKNOWN: { label: "Unknown", tone: "neutral" },
};

export const TYPE_LABELS: Record<UberOrderType, string> = {
  PICK_UP: "Pickup",
  DINE_IN: "Dine in",
  DELIVERY_BY_UBER: "Uber delivery",
  DELIVERY_BY_RESTAURANT: "Own delivery",
  UNKNOWN: "Order",
};

export const money = (cents: number | null | undefined, currency: string | null) =>
  cents == null
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(cents / 100);

/** A time in the store's own timezone, e.g. "3:30 PM". */
export const localTime = (iso: string, timezone: string | null) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone || undefined,
  }).format(parseISO(iso));

/** "2× Burger, 1× Fries" or "—". */
export const itemsSummary = (items: { title: string; quantity: number }[]) =>
  items.length ? items.map((i) => `${i.quantity}× ${i.title}`).join(", ") : "—";
