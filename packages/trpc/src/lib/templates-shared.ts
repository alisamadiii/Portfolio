// Template placeholders + the "/" and "[[" triggers of template-aware text
// boxes. Pure and client-safe: the hub previews with the same resolver the
// server books meetings with.

export type PlaceholderGroup = "Lead" | "Business" | "Meeting" | "You";

export const PLACEHOLDERS = [
  { key: "lead name", group: "Lead" },
  { key: "lead first name", group: "Lead" },
  { key: "lead email", group: "Lead" },
  { key: "lead phone", group: "Lead" },
  { key: "lead message", group: "Lead" },
  { key: "business name", group: "Business" },
  { key: "business phone", group: "Business" },
  { key: "business address", group: "Business" },
  { key: "business hours", group: "Business" },
  { key: "website", group: "Business" },
  { key: "meeting date", group: "Meeting" },
  { key: "meeting time", group: "Meeting" },
  { key: "my name", group: "You" },
] as const satisfies readonly { key: string; group: PlaceholderGroup }[];

export type PlaceholderKey = (typeof PLACEHOLDERS)[number]["key"];
export type PlaceholderValues = Partial<Record<PlaceholderKey, string | null | undefined>>;

/** "  Lead   Name " → "lead name": placeholders ignore case and extra spaces. */
const normalizeKey = (raw: string) => raw.trim().replace(/\s+/g, " ").toLowerCase();

const PLACEHOLDER_RE = /\[\[([^[\]\n]{1,40})\]\]/g;

/**
 * Fills [[placeholders]]. Unknown keys and keys without a value stay as typed
 * and are listed in `missing`, so nothing is silently dropped.
 */
export function resolveTemplate(text: string, values: PlaceholderValues) {
  const missing = new Set<string>();
  const out = text.replace(PLACEHOLDER_RE, (match, raw: string) => {
    const key = normalizeKey(raw) as PlaceholderKey;
    const value = values[key]?.trim();
    if (value) return value;
    missing.add(key);
    return match;
  });
  return { text: out, missing: [...missing] };
}

/** First word of a full name ("Sarah J. Smith" → "Sarah"). */
export const firstName = (name: string | null | undefined) => name?.trim().split(/\s+/)[0] ?? "";

// ─── Text box triggers ───────────────────────────────────────────

export type Trigger = {
  /** "/" opens snippets, "[[" opens placeholders. */
  kind: "slash" | "placeholder";
  /** Index of the trigger's first character ("/" or the first "["). */
  start: number;
  /** What's typed after the trigger, up to the caret. */
  query: string;
};

/**
 * The trigger just before the caret, if any: "[[" not yet closed on this
 * line, or "/" at the start of a word (so URLs and "and/or" don't open it).
 */
export function findTrigger(text: string, caret: number): Trigger | null {
  const before = text.slice(0, caret);

  const open = before.lastIndexOf("[[");
  if (open !== -1) {
    const query = before.slice(open + 2);
    if (!/[\]\n[]/.test(query) && query.length <= 40) {
      return { kind: "placeholder", start: open, query };
    }
  }

  const slash = /(^|\s)\/([^\s/]{0,40})$/.exec(before);
  if (slash) {
    return { kind: "slash", start: before.length - slash[2]!.length - 1, query: slash[2]! };
  }
  return null;
}

/** Replaces the trigger (up to the caret) with `insert`; returns the new caret too. */
export function applyInsert(text: string, trigger: Trigger, caret: number, insert: string) {
  const next = text.slice(0, trigger.start) + insert + text.slice(caret);
  return { text: next, caret: trigger.start + insert.length };
}

/** Placeholder suggestions matching what's typed after "[[". */
export const matchPlaceholders = (query: string) => {
  const q = normalizeKey(query);
  return PLACEHOLDERS.filter((p) => !q || p.key.includes(q));
};

// ─── Values ──────────────────────────────────────────────────────

/** Business info keys (agency_client.businessInfo) behind the business placeholders. */
export const BUSINESS_CONTACT_KEYS = {
  name: "website", // labelled "Business name" in Business info
  phone: "businessPhone",
  address: "businessAddress",
  hours: "businessHours",
} as const;

/**
 * Every placeholder's value for one lead + project (+ meeting time). Shared so
 * the hub's preview and the booked event read the same.
 */
export function placeholderValues(input: {
  lead?: { name?: string | null; email?: string | null; phone?: string | null; message?: string | null } | null;
  businessInfo?: Record<string, string[] | undefined> | null;
  websiteUrl?: string | null;
  myName?: string | null;
  meetingStart?: Date | null;
  /** IANA zone for the meeting date/time text (the booker's browser). */
  timeZone?: string;
}): PlaceholderValues {
  const info = input.businessInfo ?? {};
  const one = (key: string) => info[key]?.find((v) => v?.trim())?.trim() ?? "";
  const start = input.meetingStart;
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    start ? new Intl.DateTimeFormat("en-US", { ...opts, timeZone: input.timeZone }).format(start) : "";
  return {
    "lead name": input.lead?.name ?? "",
    "lead first name": firstName(input.lead?.name),
    "lead email": input.lead?.email ?? "",
    "lead phone": input.lead?.phone ?? "",
    "lead message": input.lead?.message ?? "",
    "business name": one(BUSINESS_CONTACT_KEYS.name),
    "business phone": one(BUSINESS_CONTACT_KEYS.phone),
    "business address": one(BUSINESS_CONTACT_KEYS.address),
    "business hours": one(BUSINESS_CONTACT_KEYS.hours),
    website: input.websiteUrl ?? "",
    "meeting date": fmt({ weekday: "long", month: "long", day: "numeric" }),
    "meeting time": fmt({ hour: "numeric", minute: "2-digit" }),
    "my name": input.myName ?? "",
  };
}
