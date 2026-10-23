// ─── Google Ads conversion actions: presets + display helpers ─────
// Pure (no server-only) so the Hub shares labels and the preset list.
// Presets only use import-based and call actions: they work without a Google
// tag on the client's site, because our server reports the conversions.

/** Which lead stage our server reports to an action. */
export const UPLOAD_STAGES = ["lead", "qualified", "won"] as const;
export type UploadStage = (typeof UPLOAD_STAGES)[number];

/** Stages an action can be wired to in the UI (booking shares the lead upload). */
export const WIRABLE_STAGES = ["lead", "booking", "qualified", "won"] as const;
export type WirableStage = (typeof WIRABLE_STAGES)[number];

export const STAGE_LABELS: Record<WirableStage, string> = {
  lead: "A form lead comes in",
  booking: "An appointment is booked",
  qualified: "A lead is marked qualified",
  won: "A lead is marked won",
};

/** Keys of agency_client.google_ads_actions, plus "won" (the closed-deal column). */
export type WiredKey = WirableStage | "calls";

/** Action resource names wired to each stage (agency_client.google_ads_actions + the closed-deal column). */
export type WiredActions = Partial<Record<WiredKey, string>>;

export type ConversionCategory =
  | "SUBMIT_LEAD_FORM"
  | "QUALIFIED_LEAD"
  | "CONVERTED_LEAD"
  | "PHONE_CALL_LEAD"
  | "REQUEST_QUOTE"
  | "CONTACT"
  | "BOOK_APPOINTMENT"
  | "PURCHASE";

/** Categories offered when creating an action by hand. */
export const EDITABLE_CATEGORIES: ConversionCategory[] = [
  "SUBMIT_LEAD_FORM",
  "QUALIFIED_LEAD",
  "CONVERTED_LEAD",
  "REQUEST_QUOTE",
  "CONTACT",
  "BOOK_APPOINTMENT",
  "PHONE_CALL_LEAD",
  "PURCHASE",
];

// Goal group names, the way Google Ads shows them.
export const CATEGORY_LABELS: Record<string, string> = {
  SUBMIT_LEAD_FORM: "Submit lead forms",
  QUALIFIED_LEAD: "Qualified leads",
  CONVERTED_LEAD: "Converted leads",
  PHONE_CALL_LEAD: "Phone call leads",
  REQUEST_QUOTE: "Request quotes",
  CONTACT: "Contacts",
  BOOK_APPOINTMENT: "Book appointments",
  PURCHASE: "Purchases",
  SIGNUP: "Sign-ups",
  PAGE_VIEW: "Page views",
  ENGAGEMENT: "Engagements",
  YOUTUBE_FOLLOW_ON_VIEWS: "YouTube follow-on views",
  STORE_VISIT: "Store visits",
  GET_DIRECTIONS: "Get directions",
  OUTBOUND_CLICK: "Outbound clicks",
  DEFAULT: "Other",
};

export const categoryLabel = (category: string) =>
  CATEGORY_LABELS[category] ??
  category.charAt(0) + category.slice(1).toLowerCase().replaceAll("_", " ");

// Where conversions come from ("Conversion source" in Google Ads).
const SOURCE_LABELS: Record<string, string> = {
  UPLOAD_CLICKS: "Import from clicks",
  UPLOAD_CALLS: "Import from calls",
  AD_CALL: "Calls from ads",
  CLICK_TO_CALL: "Calls from ads",
  WEBSITE_CALL: "Calls from website",
  WEBPAGE: "Website",
  WEBPAGE_CODELESS: "Website",
  GOOGLE_ANALYTICS_4_CUSTOM: "Google Analytics",
  GOOGLE_ANALYTICS_4_PURCHASE: "Google Analytics",
  STORE_VISITS: "Store visits",
};
const ORIGIN_LABELS: Record<string, string> = {
  YOUTUBE_HOSTED: "YouTube hosted",
  GOOGLE_HOSTED: "Google hosted",
  CALLS_FROM_ADS: "Calls from ads",
  STORE: "Store",
  WEBSITE: "Website",
  APP: "App",
};

export const sourceLabel = (type: string, origin?: string) =>
  SOURCE_LABELS[type] ?? (origin && ORIGIN_LABELS[origin]) ?? "Other";

/** Only these types can be created or fully edited here; the rest are managed in Google Ads. */
export const MANAGED_TYPES = ["UPLOAD_CLICKS", "AD_CALL"] as const;
export type ManagedType = (typeof MANAGED_TYPES)[number];

export type ActionSpec = {
  name: string;
  type: ManagedType;
  category: ConversionCategory;
  countingType: "ONE_PER_CLICK" | "MANY_PER_CLICK";
  clickThroughLookbackWindowDays: number;
  primaryForGoal: boolean;
  /** Default value in the account currency; 0 = no value. */
  defaultValue: number;
};

export type PresetAction = ActionSpec & {
  key: WiredKey;
  /** What the client reads in the preset card. */
  description: string;
};

export type ConversionPreset = {
  id: string;
  name: string;
  description: string;
  actions: PresetAction[];
};

export const CONVERSION_PRESETS: ConversionPreset[] = [
  {
    id: "lead-gen",
    name: "Lead gen starter",
    description:
      "Four actions that track leads from your ads all the way to closed deals. No Google tag needed: we report them from your Hub.",
    actions: [
      {
        key: "lead",
        name: "Website lead",
        description: "Someone who clicked an ad sends a form on your website.",
        type: "UPLOAD_CLICKS",
        category: "SUBMIT_LEAD_FORM",
        countingType: "ONE_PER_CLICK",
        clickThroughLookbackWindowDays: 90,
        primaryForGoal: true,
        defaultValue: 0,
      },
      {
        key: "calls",
        name: "Calls from ads",
        description:
          "Someone calls you from the phone number on your ad for 60 seconds or more.",
        type: "AD_CALL",
        category: "PHONE_CALL_LEAD",
        countingType: "ONE_PER_CLICK",
        clickThroughLookbackWindowDays: 30,
        primaryForGoal: true,
        defaultValue: 0,
      },
      {
        key: "booking",
        name: "Booked appointment",
        description:
          "Someone who clicked an ad books an appointment through your website.",
        type: "UPLOAD_CLICKS",
        category: "BOOK_APPOINTMENT",
        countingType: "ONE_PER_CLICK",
        clickThroughLookbackWindowDays: 90,
        primaryForGoal: true,
        defaultValue: 0,
      },
      {
        key: "qualified",
        name: "Qualified lead",
        description: "You mark an ad lead as qualified in the Hub.",
        type: "UPLOAD_CLICKS",
        category: "QUALIFIED_LEAD",
        countingType: "ONE_PER_CLICK",
        clickThroughLookbackWindowDays: 90,
        primaryForGoal: false,
        defaultValue: 0,
      },
      {
        key: "won",
        name: "Closed deal",
        description: "You mark an ad lead as won, with the deal's value.",
        type: "UPLOAD_CLICKS",
        category: "CONVERTED_LEAD",
        countingType: "ONE_PER_CLICK",
        clickThroughLookbackWindowDays: 90,
        primaryForGoal: false,
        defaultValue: 0,
      },
    ],
  },
];

export const findPreset = (id: string) =>
  CONVERSION_PRESETS.find((p) => p.id === id);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Which preset actions already exist and which must be created. Makes applying
 * a preset safe to repeat.
 *
 * `existing` must include REMOVED actions: Google keeps their names reserved,
 * so a preset action whose name is taken by a removed one is created as
 * "Website lead 2" (then 3, ...). An enabled "Website lead" or "Website lead 2"
 * counts as already there.
 */
export function planPreset(
  preset: ConversionPreset,
  existing: { name: string; resourceName: string; status: string }[]
) {
  const taken = new Set(existing.map((action) => action.name.trim().toLowerCase()));
  const live = existing.filter((action) => action.status !== "REMOVED");

  const reuse: { key: PresetAction["key"]; resourceName: string }[] = [];
  const create: PresetAction[] = [];
  for (const action of preset.actions) {
    const pattern = new RegExp(`^${escapeRegExp(action.name)}( \\d+)?$`, "i");
    const found = live.find((candidate) => pattern.test(candidate.name.trim()));
    if (found) {
      reuse.push({ key: action.key, resourceName: found.resourceName });
      continue;
    }
    let name = action.name;
    for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${action.name} ${n}`;
    taken.add(name.toLowerCase());
    create.push({ ...action, name });
  }
  return { reuse, create };
}

export type EditableFields = {
  name: string;
  category: ConversionCategory;
  countingType: "ONE_PER_CLICK" | "MANY_PER_CLICK";
  clickThroughLookbackWindowDays: number;
  primaryForGoal: boolean;
  defaultValue: number;
};

// Google field paths for each editable field.
const FIELD_PATHS: Record<keyof EditableFields, string> = {
  name: "name",
  category: "category",
  countingType: "counting_type",
  clickThroughLookbackWindowDays: "click_through_lookback_window_days",
  primaryForGoal: "primary_for_goal",
  defaultValue: "value_settings.default_value",
};

/** The update body + mask for the fields that changed; null when nothing did. */
export function buildUpdate(
  before: EditableFields,
  after: Partial<EditableFields>
) {
  const changed = (Object.keys(after) as (keyof EditableFields)[]).filter(
    (key) => after[key] !== undefined && after[key] !== before[key]
  );
  if (!changed.length) return null;

  const body: Record<string, unknown> = {};
  for (const key of changed) {
    if (key === "defaultValue")
      body.valueSettings = { defaultValue: after.defaultValue };
    else body[key] = after[key];
  }
  return { body, updateMask: changed.map((key) => FIELD_PATHS[key]).join(",") };
}

// Sources whose capture counts as the "lead" stage (manual entries don't).
export const LEAD_STAGE_SOURCES = ["form", "booking"] as const;

/**
 * Whether a lead's "lead" stage should ever be reported. Pure, shared with
 * the upload gate and tests: canceled bookings must not become conversions.
 */
export const leadStageEligible = (lead: {
  source: string;
  status: string;
  bookingCanceledAt?: Date | null;
}) =>
  lead.status !== "spam" &&
  (LEAD_STAGE_SOURCES as readonly string[]).includes(lead.source) &&
  !lead.bookingCanceledAt;

export type TrackingStatus =
  "recording" | "no_recent" | "awaiting" | "inactive";

export const TRACKING_LABELS: Record<TrackingStatus, string> = {
  recording: "Recording conversions",
  no_recent: "No recent conversions",
  awaiting: "Awaiting conversions",
  inactive: "Inactive",
};

/**
 * Close to Google's own tracking status: recording when conversions came in
 * during the last 7 days, awaiting when none ever did.
 */
export function trackingStatus(action: {
  status: string;
  last7Days: number;
  everConverted: boolean;
}): TrackingStatus {
  if (action.status !== "ENABLED") return "inactive";
  if (action.last7Days > 0) return "recording";
  return action.everConverted ? "no_recent" : "awaiting";
}
