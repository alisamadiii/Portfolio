import type { ComponentType } from "react";

import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { orderStatusGroup as grubhubStatusGroup } from "@workspace/trpc/lib/grubhub-constants";
import { orderStatusGroup, type OrderStatusGroup } from "@workspace/trpc/lib/uber-eats-shared";

import { DoorDashLogo, GrubhubLogo, ShopifyLogo, UberEatsLogo } from "@/components/ds/brand-logos";
import type { BadgeTone } from "@/components/ds/ui/badge";
import { FULFILLMENT_LABELS, STATUS_META } from "@/components/grubhub/format";
import { orderBadge } from "@/components/shopify/format";
import { itemsSummary, STATE_LABELS, TYPE_LABELS } from "@/components/uber-eats/format";
import type { AppId } from "@/lib/apps";

// Orders apps (delivery marketplaces + Shopify) share one Orders page and one
// Home section. Each provider maps its own rows into DeliveryOrderRow; the UI
// never looks at a provider's raw shape. Uber Eats and Grubhub store orders,
// Shopify's are read live; DoorDash is onboarding-only.

export const DELIVERY_APP_IDS = ["uber-eats", "doordash", "grubhub", "shopify"] as const;
export type DeliveryAppId = (typeof DELIVERY_APP_IDS)[number];

export const hasDeliveryApp = (installed: readonly AppId[]) =>
  DELIVERY_APP_IDS.some((id) => installed.includes(id));

export const installedDeliveryApps = (installed: readonly AppId[]) =>
  DELIVERY_APP_IDS.filter((id) => installed.includes(id));

/** Installed delivery apps whose orders the hub stores (the ones the Orders page can list). */
export const orderProviders = (installed: readonly AppId[]) =>
  installedDeliveryApps(installed).filter((id) => DELIVERY_PROVIDERS[id].hasOrders);

export const DELIVERY_PROVIDERS: Record<
  DeliveryAppId,
  { name: string; Logo: ComponentType<{ className?: string }>; hasOrders: boolean }
> = {
  "uber-eats": { name: "Uber Eats", Logo: UberEatsLogo, hasOrders: true },
  doordash: { name: "DoorDash", Logo: DoorDashLogo, hasOrders: false },
  grubhub: { name: "Grubhub", Logo: GrubhubLogo, hasOrders: true },
  shopify: { name: "Shopify", Logo: ShopifyLogo, hasOrders: true },
};

export type DeliveryOrderRow = {
  provider: DeliveryAppId;
  id: string;
  displayId: string;
  customer: string;
  placedAt: string;
  timezone: string | null;
  itemsSummary: string;
  itemCount: number;
  totalCents: number | null;
  currency: string | null;
  status: OrderStatusGroup;
  stateLabel: string;
  tone: BadgeTone;
  typeLabel: string;
  /** Still waiting for the restaurant (Accept / Confirm shows when allowed). */
  awaitingAccept: boolean;
};

/** "uber-eats:abc" ↔ { provider, id }: how the Orders page keeps one `?order=` param across providers. */
export const orderKey = (provider: DeliveryAppId, id: string) => `${provider}:${id}`;
export const parseOrderKey = (key: string | null): { provider: DeliveryAppId; id: string } | null => {
  if (!key) return null;
  const i = key.indexOf(":");
  const provider = i > 0 ? key.slice(0, i) : null;
  if (provider && (DELIVERY_APP_IDS as readonly string[]).includes(provider)) {
    return { provider: provider as DeliveryAppId, id: key.slice(i + 1) };
  }
  // Older links carried a bare Uber id.
  return { provider: "uber-eats", id: key };
};

type UberOrder = RouterOutputs["uberEats"]["orders"]["items"][number];

export const fromUberOrder = (o: UberOrder, timezone: string | null): DeliveryOrderRow => ({
  provider: "uber-eats",
  id: o.id,
  displayId: o.displayId,
  customer: o.eaterFirstName ?? "Customer",
  placedAt: o.placedAt,
  timezone,
  itemsSummary: itemsSummary(o.items),
  itemCount: o.itemCount,
  totalCents: o.totalCents,
  currency: o.currency,
  status: orderStatusGroup(o.state),
  stateLabel: STATE_LABELS[o.state].label,
  tone: STATE_LABELS[o.state].tone,
  typeLabel: TYPE_LABELS[o.type],
  awaitingAccept: o.state === "CREATED",
});

type GrubhubOrder = RouterOutputs["grubhub"]["orders"]["items"][number];

/** Grubhub rows: the total shown is Grubhub's merchant total (before commission), same as the app page. */
export const fromGrubhubOrder = (o: GrubhubOrder, timezone: string | null): DeliveryOrderRow => ({
  provider: "grubhub",
  id: o.id,
  displayId: o.orderNumber,
  customer: o.dinerName ?? "Customer",
  placedAt: o.placedAt,
  timezone,
  itemsSummary: itemsSummary(o.items),
  itemCount: o.itemCount,
  totalCents: o.merchantTotalCents,
  currency: "USD",
  status: grubhubStatusGroup(o.status),
  stateLabel: o.isTest ? `${STATUS_META[o.status].label} (test)` : STATUS_META[o.status].label,
  tone: STATUS_META[o.status].tone,
  typeLabel: FULFILLMENT_LABELS[o.fulfillment],
  awaitingAccept: o.status === "RESTAURANT_CONFIRMABLE",
});

type ShopifyOrder = RouterOutputs["shopify"]["orders"]["items"][number];

/** Shopify rows: no customer name (the app holds no protected customer data), total after refunds. */
export const fromShopifyOrder = (o: ShopifyOrder, timezone: string | null): DeliveryOrderRow => {
  const badge = orderBadge(o);
  return {
    provider: "shopify",
    id: o.id,
    displayId: o.name.replace(/^#/, ""),
    customer: "Online order",
    placedAt: o.placedAt,
    timezone,
    itemsSummary: itemsSummary(o.items),
    itemCount: o.itemCount,
    totalCents: o.totalCents,
    currency: o.currency,
    status: o.status,
    stateLabel: badge.label,
    tone: badge.tone,
    typeLabel: "Online store",
    awaitingAccept: false,
  };
};

/** Newest first across providers. */
export const sortRows = (rows: DeliveryOrderRow[]) =>
  [...rows].sort((a, b) => b.placedAt.localeCompare(a.placedAt));
