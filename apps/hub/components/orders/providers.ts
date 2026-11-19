import type { ComponentType } from "react";

import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { orderStatusGroup, type OrderStatusGroup } from "@workspace/trpc/lib/uber-eats-shared";

import { DoorDashLogo, UberEatsLogo } from "@/components/ds/brand-logos";
import type { BadgeTone } from "@/components/ds/ui/badge";
import { itemsSummary, STATE_LABELS, TYPE_LABELS } from "@/components/uber-eats/format";
import type { AppId } from "@/lib/apps";

// Delivery apps share one Orders page and one Home section. Each provider
// maps its own rows into DeliveryOrderRow; the UI never looks at a provider's
// raw shape. Today only Uber Eats stores orders; DoorDash is onboarding-only.

export const DELIVERY_APP_IDS = ["uber-eats", "doordash"] as const;
export type DeliveryAppId = (typeof DELIVERY_APP_IDS)[number];

export const hasDeliveryApp = (installed: readonly AppId[]) =>
  DELIVERY_APP_IDS.some((id) => installed.includes(id));

export const installedDeliveryApps = (installed: readonly AppId[]) =>
  DELIVERY_APP_IDS.filter((id) => installed.includes(id));

export const DELIVERY_PROVIDERS: Record<
  DeliveryAppId,
  { name: string; Logo: ComponentType<{ className?: string }>; hasOrders: boolean }
> = {
  "uber-eats": { name: "Uber Eats", Logo: UberEatsLogo, hasOrders: true },
  doordash: { name: "DoorDash", Logo: DoorDashLogo, hasOrders: false },
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
  /** Still waiting for the restaurant (Accept shows when allowed). */
  awaitingAccept: boolean;
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
