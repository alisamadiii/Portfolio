import type { GrubhubFulfillment, GrubhubIntegrationStatus, GrubhubOrderStatus } from "@workspace/drizzle/schema";

// Shared by the hub page (client bundle) and the router's zod schemas. Keep
// this file free of node imports.

export type StatusTone = "neutral" | "info" | "success" | "warning" | "coral";

export const ORDER_STATUSES = [
  "ANTICIPATED",
  "RESTAURANT_CONFIRMABLE",
  "CONFIRMED",
  "PICKUP_READY",
  "OUT_FOR_DELIVERY",
  "FULFILLED",
  "CANCELLED",
  "REJECTED",
  "STALE",
  "UNKNOWN",
] as const satisfies readonly GrubhubOrderStatus[];

/** Orders still in flight: the hourly reconcile re-reads these, the lists poll faster while any exist. */
export const OPEN_ORDER_STATUSES: GrubhubOrderStatus[] = [
  "ANTICIPATED",
  "RESTAURANT_CONFIRMABLE",
  "CONFIRMED",
  "PICKUP_READY",
  "OUT_FOR_DELIVERY",
  "UNKNOWN",
];
/** Orders that count as sales. A new order isn't sold until it's confirmed; cancelled, rejected and stale sold nothing. */
export const SOLD_ORDER_STATUSES: GrubhubOrderStatus[] = ["CONFIRMED", "PICKUP_READY", "OUT_FOR_DELIVERY", "FULFILLED"];
/** Needs the restaurant's answer right now. */
export const NEW_ORDER_STATUSES: GrubhubOrderStatus[] = ["RESTAURANT_CONFIRMABLE"];

/** The three buckets the Orders page filters by; every status lands in exactly one. */
export type OrderStatusGroup = "open" | "completed" | "canceled";
export const ORDER_STATUS_GROUPS: Record<OrderStatusGroup, GrubhubOrderStatus[]> = {
  open: OPEN_ORDER_STATUSES,
  completed: ["FULFILLED"],
  canceled: ["CANCELLED", "REJECTED", "STALE"],
};
export const orderStatusGroup = (status: GrubhubOrderStatus): OrderStatusGroup =>
  status === "FULFILLED"
    ? "completed"
    : status === "CANCELLED" || status === "REJECTED" || status === "STALE"
      ? "canceled"
      : "open";

/**
 * Grubhub cancels a new order nobody confirmed after 8 to 12 minutes ("STALE").
 * The clock shows the pessimistic end.
 */
export const CONFIRM_WINDOW_MS = 8 * 60_000;

/** Grubhub's reject reason codes (PUT status REJECTED), with the words staff see. */
export const REJECT_REASONS = [
  { code: "RESTAURANT_OFFLINE", label: "Restaurant is closed or offline" },
  { code: "MENU_ITEM_NOT_FOUND", label: "Item not on our menu" },
  { code: "PRICE_MISMATCH", label: "Price doesn't match" },
  { code: "OTHER", label: "Other (explain below)" },
] as const;
export type RejectCode = (typeof REJECT_REASONS)[number]["code"];
export const REJECT_CODES = REJECT_REASONS.map((r) => r.code) as [RejectCode, ...RejectCode[]];

/** "Ready in" choices sent as wait_time_in_minutes on CONFIRMED. */
export const WAIT_TIME_CHOICES = [10, 15, 20, 30, 45, 60] as const;
export type WaitTimeChoice = (typeof WAIT_TIME_CHOICES)[number];

/**
 * Why the restaurant asks Grubhub Care to cancel a confirmed order. Grubhub's
 * change-request reason_code isn't enumerated in its spec, so these hub codes
 * go out as both the code and a readable reason.
 */
export const CANCEL_REASONS = [
  { code: "OUT_OF_ITEM", label: "Out of an item" },
  { code: "KITCHEN_CLOSED", label: "Kitchen closed early" },
  { code: "TOO_BUSY", label: "Kitchen can't take it" },
  { code: "CUSTOMER_REQUEST", label: "Customer asked to cancel" },
  { code: "OTHER", label: "Other (explain below)" },
] as const;
export type CancelCode = (typeof CANCEL_REASONS)[number]["code"];
export const CANCEL_CODES = CANCEL_REASONS.map((r) => r.code) as [CancelCode, ...CancelCode[]];

/** How an order status reads on screen. */
export const STATUS_META: Record<GrubhubOrderStatus, { label: string; tone: StatusTone }> = {
  RESTAURANT_CONFIRMABLE: { label: "New", tone: "coral" },
  ANTICIPATED: { label: "Scheduled", tone: "info" },
  CONFIRMED: { label: "In progress", tone: "info" },
  PICKUP_READY: { label: "Ready", tone: "success" },
  OUT_FOR_DELIVERY: { label: "On the way", tone: "info" },
  FULFILLED: { label: "Completed", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  REJECTED: { label: "Rejected", tone: "neutral" },
  STALE: { label: "Missed", tone: "warning" },
  UNKNOWN: { label: "Unknown", tone: "neutral" },
};

export const FULFILLMENT_LABELS: Record<GrubhubFulfillment, string> = {
  PICKUP: "Pickup",
  GRUBHUB_DELIVERY: "Grubhub delivery",
  SELF_DELIVERY: "Own delivery",
  UNKNOWN: "Order",
};

export const INTEGRATION_META: Record<GrubhubIntegrationStatus, { label: string; tone: StatusTone; text: string }> = {
  PENDING: {
    label: "Waiting for Grubhub",
    tone: "info",
    text: "Grubhub still has to switch the integration on for this store. Orders start arriving here once it does.",
  },
  LIVE: { label: "Live", tone: "success", text: "Grubhub sends this store's orders to Client Hub." },
  DEACTIVATED: {
    label: "Switched off",
    tone: "neutral",
    text: "The integration was switched off on Grubhub's side. Orders go to the Grubhub tablet again.",
  },
};
