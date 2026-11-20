import type { OrderStatusGroup } from "@workspace/trpc/lib/uber-eats-shared";

import type { BadgeTone } from "@/components/ds/ui/badge";

// How a Shopify order and product read on screen: the app page, the order
// dialog, the Orders page and Home all import these.

/** One badge per order: cancelled / refunded first, then shipping state. */
export function orderBadge(o: {
  status: OrderStatusGroup;
  cancelledAt: string | null;
  financialStatus: string | null;
  fulfillmentStatus: string;
}): { label: string; tone: BadgeTone } {
  if (o.cancelledAt) return { label: "Canceled", tone: "neutral" };
  if (o.financialStatus === "REFUNDED") return { label: "Refunded", tone: "neutral" };
  if (o.financialStatus === "VOIDED") return { label: "Voided", tone: "neutral" };
  if (o.fulfillmentStatus === "FULFILLED") return { label: "Shipped", tone: "success" };
  if (o.fulfillmentStatus === "PARTIALLY_FULFILLED") return { label: "Partly shipped", tone: "info" };
  if (o.fulfillmentStatus === "ON_HOLD") return { label: "On hold", tone: "warning" };
  if (o.financialStatus === "PENDING" || o.financialStatus === "AUTHORIZED") return { label: "Awaiting payment", tone: "warning" };
  return { label: "To ship", tone: "coral" };
}

export const FINANCIAL_LABELS: Record<string, string> = {
  PAID: "Paid",
  PENDING: "Payment pending",
  AUTHORIZED: "Authorized",
  PARTIALLY_PAID: "Partly paid",
  PARTIALLY_REFUNDED: "Partly refunded",
  REFUNDED: "Refunded",
  VOIDED: "Voided",
  EXPIRED: "Expired",
};

export const financialLabel = (s: string | null) => (s ? (FINANCIAL_LABELS[s] ?? s.toLowerCase().replace(/_/g, " ")) : "—");

export const PRODUCT_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: "Active", tone: "success" },
  DRAFT: { label: "Draft", tone: "neutral" },
  ARCHIVED: { label: "Archived", tone: "neutral" },
  UNLISTED: { label: "Unlisted", tone: "info" },
};

/** Dollars typed by the owner → cents, or null when it isn't a price. */
export const parsePrice = (value: string): number | null => {
  const v = value.trim().replace(/[$,]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return null;
  return Math.round(Number(v) * 100);
};

export const centsToInput = (cents: number | null) => (cents == null ? "" : (cents / 100).toFixed(2));
