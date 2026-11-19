// DoorDash app: constants the hub client imports too (no node imports here).

import type { DoorDashOnboardingStatus } from "@workspace/drizzle/schema";

export const ONBOARDING_STATUSES = [
  "PENDING",
  "MENU_REQUESTED",
  "INTEGRATION_REQUESTED",
  "MENU_BLOCK",
  "ACTIVATION_BLOCK",
  "MENU_QUALIFIED",
  "INTEGRATION_ACTIVATED",
  "ABANDONED",
] as const satisfies readonly DoorDashOnboardingStatus[];

export const EXCLUSION_CODES = [
  "DUPLICATE_LOCATION_ID",
  "DOORDASH_RETAIL_STORE",
  "VIRTUAL_BRAND_DETECTED",
  "SELF_DELIVERY_DETECTED",
  "DOORDASH_DRIVE_STORE",
  "STORE_LIVE_ON_REQUESTED_POS_PROVIDER",
  "SFDC_ACCOUNT_RECORD_NOT_FOUND",
  "MENU_PULLING_REQUEST_FAILURE",
  "STORE_HOURS_NOT_POPULATED_FAILURE",
  "MENU_BLANK_FAILURE",
  "MENU_JOB_FAILURE",
  "STORE_NOT_ACTIVE",
] as const;
export type ExclusionCode = (typeof EXCLUSION_CODES)[number];

export type StatusTone = "neutral" | "info" | "success" | "warning" | "coral";

/** What each onboarding status means to the owner. Tones match the hub Badge. */
export const STATUS_META: Record<DoorDashOnboardingStatus, { label: string; tone: StatusTone; text: string }> = {
  PENDING: {
    label: "Requested",
    tone: "info",
    text: "We've asked DoorDash to connect this store. The first update usually arrives within a few minutes.",
  },
  MENU_REQUESTED: {
    label: "Fetching menu",
    tone: "info",
    text: "DoorDash is pulling the store's menu from Client Hub.",
  },
  INTEGRATION_REQUESTED: {
    label: "In review",
    tone: "info",
    text: "DoorDash is setting the store up on its side.",
  },
  MENU_BLOCK: {
    label: "Waiting on menu",
    tone: "warning",
    text: "DoorDash couldn't get a menu for this store, so the connection is on hold.",
  },
  ACTIVATION_BLOCK: {
    label: "Blocked",
    tone: "warning",
    text: "DoorDash can't activate the store yet. The note below says why.",
  },
  MENU_QUALIFIED: {
    label: "Menu ready",
    tone: "success",
    text: "DoorDash accepted the menu. Activation is the next step.",
  },
  INTEGRATION_ACTIVATED: {
    label: "Live",
    tone: "success",
    text: "The store is connected and DoorDash sends its orders through this integration.",
  },
  ABANDONED: {
    label: "Abandoned",
    tone: "neutral",
    text: "DoorDash closed this request. Press Restart to ask again.",
  },
};

/** Plain-English fix for each exclusion code DoorDash can send. */
export const EXCLUSION_TEXT: Record<ExclusionCode, string> = {
  DUPLICATE_LOCATION_ID: "Another DoorDash store is already connected under this project. Disconnect it first.",
  DOORDASH_RETAIL_STORE: "This is a retail store on DoorDash. Only restaurant stores can connect here.",
  VIRTUAL_BRAND_DETECTED:
    "DoorDash sees this store as a virtual brand. Each brand needs its own project; connect it from there.",
  SELF_DELIVERY_DETECTED: "This store uses its own drivers on DoorDash, which this connection doesn't support yet.",
  DOORDASH_DRIVE_STORE: "This is a DoorDash Drive store, not a Marketplace store.",
  STORE_LIVE_ON_REQUESTED_POS_PROVIDER: "DoorDash already lists this store as connected to Client Hub. Press Refresh.",
  SFDC_ACCOUNT_RECORD_NOT_FOUND: "DoorDash couldn't find the store's merchant record. Contact DoorDash merchant support.",
  MENU_PULLING_REQUEST_FAILURE: "DoorDash couldn't fetch a menu from Client Hub.",
  STORE_HOURS_NOT_POPULATED_FAILURE: "Add the store's hours in the DoorDash Merchant Portal, then press Restart.",
  MENU_BLANK_FAILURE: "The menu DoorDash received was empty.",
  MENU_JOB_FAILURE: "DoorDash's menu import failed on its side. Press Restart to try again.",
  STORE_NOT_ACTIVE:
    "DoorDash hasn't activated the store itself yet (banking details or a review). Check the email DoorDash sent you.",
};

/** Statuses where DoorDash lets the merchant start the job over. */
export const canRestart = (status: DoorDashOnboardingStatus) =>
  status !== "INTEGRATION_ACTIVATED" && status !== "MENU_REQUESTED" && status !== "PENDING";

/** Statuses that won't change on their own, so the page can stop polling. */
export const isFinalStatus = (status: DoorDashOnboardingStatus) =>
  status === "INTEGRATION_ACTIVATED" || status === "ABANDONED";
