// ─── Leads inbox (shared, browser-safe) ──────────────────────────
// A lead's conversation: texts through the project's Telnyx number when the
// lead has a phone, email when they only left an address. Server side:
// lib/telnyx.ts + routers/agency.ts (agency.inbox / agency.sms).

export type InboxChannel = "sms" | "email";

/**
 * A US/Canada phone number as E.164 ("+19045550100"), or null when it can't
 * be one. Numbers with another country code are kept when already "+…".
 */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") && !trimmed.startsWith("+1")) {
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  // NANP: area code and exchange never start with 0 or 1.
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) return null;
  return `+1${national}`;
}

/** "+19045550100" -> "(904) 555-0100"; anything else comes back as is. */
export function formatPhone(e164: string | null | undefined) {
  if (!e164) return "";
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}

/** The ways a lead can be reached, texting first. */
export function leadChannels(lead: { phone?: string | null; email?: string | null }): InboxChannel[] {
  const out: InboxChannel[] = [];
  if (toE164(lead.phone)) out.push("sms");
  if (lead.email?.trim()) out.push("email");
  return out;
}

// GSM-7 basic set + extension table (extension chars cost two slots).
const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = "^{}\\[~]|€";

/**
 * How many SMS parts a text costs. GSM-7: 160 per single part, 153 per part
 * when split. Anything outside GSM-7 (emoji, curly quotes) switches the whole
 * text to UCS-2: 70 single, 67 split (emoji count as two units).
 */
export function smsSegments(text: string) {
  let units = 0;
  let gsm = true;
  for (const ch of text) {
    if (GSM_BASIC.includes(ch)) units += 1;
    else if (GSM_EXT.includes(ch)) units += 2;
    else {
      gsm = false;
      break;
    }
  }
  if (!gsm) units = text.length; // UTF-16 code units, which is what UCS-2 counts
  const [single, multi] = gsm ? [160, 153] : [70, 67];
  const segments = units === 0 ? 0 : units <= single ? 1 : Math.ceil(units / multi);
  return { segments, units, encoding: gsm ? ("GSM-7" as const) : ("UCS-2" as const) };
}

export type InboxMessage = {
  id: number;
  channel: InboxChannel;
  direction: "in" | "out";
  body: string;
  subject: string | null;
  mediaUrls: string[] | null;
  status: string;
  error: string | null;
  createdAt: string | Date;
};

export type ThreadItem<M extends InboxMessage = InboxMessage> =
  | { kind: "day"; key: string; at: Date }
  | {
      kind: "submission";
      key: string;
      at: Date;
      formName: string | null;
      message: string | null;
      source: string;
    }
  | { kind: "message"; key: string; at: Date; message: M };

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/**
 * The thread as rendered: the lead's own form submission first (that's how
 * the conversation started), then every message oldest first, with a day
 * separator whenever the local day changes.
 */
export function threadItems<M extends InboxMessage>(
  lead: {
    createdAt: string | Date;
    formName?: string | null;
    message?: string | null;
    source: string;
  },
  messages: M[]
): ThreadItem<M>[] {
  const events: Exclude<ThreadItem<M>, { kind: "day" }>[] = [];
  // A lead that started by texting in has its first text as the opener.
  if (lead.source !== "sms") {
    events.push({
      kind: "submission",
      key: "submission",
      at: new Date(lead.createdAt),
      formName: lead.formName ?? null,
      message: lead.message ?? null,
      source: lead.source,
    });
  }
  for (const message of messages) {
    events.push({ kind: "message", key: `m${message.id}`, at: new Date(message.createdAt), message });
  }
  events.sort((a, b) => a.at.getTime() - b.at.getTime() || (a.kind === "submission" ? -1 : 1));

  const out: ThreadItem<M>[] = [];
  let lastDay = "";
  for (const event of events) {
    const day = dayKey(event.at);
    if (day !== lastDay) {
      out.push({ kind: "day", key: `d${day}`, at: event.at });
      lastDay = day;
    }
    out.push(event);
  }
  return out;
}

/**
 * Telnyx per-recipient status -> our message status. Unknown ones keep the
 * row as sent, which is what the carrier last confirmed.
 */
export function telnyxStatus(status: string | undefined): "queued" | "sent" | "delivered" | "failed" {
  switch (status) {
    case "queued":
    case "sending":
      return "queued";
    case "delivered":
      return "delivered";
    case "sending_failed":
    case "delivery_failed":
      return "failed";
    default:
      return "sent";
  }
}

// ─── Email replies ───────────────────────────────────────────────
// Inbox emails go out with Reply-To "r+<leadId>.<sig>@<reply domain>"; SES
// receives the reply there (lib/inbound-email.ts). sig = HMAC of the lead id,
// so nobody can guess another lead's address.

export const replyAddress = (leadId: number, sig: string, domain: string) =>
  `r+${leadId}.${sig}@${domain}`;

/** "r+42.abc123def456@reply.example.com" -> { leadId: 42, sig }; else null. */
export function parseReplyAddress(address: string): { leadId: number; sig: string } | null {
  const m = /^r\+(\d{1,10})\.([0-9a-f]{12})@/i.exec(address.trim());
  if (!m) return null;
  const leadId = Number(m[1]);
  return leadId > 0 ? { leadId, sig: m[2]!.toLowerCase() } : null;
}

// Lines that start the quoted history in common mail apps.
const QUOTE_HEADERS = [
  /^On .{1,300}wrote:\s*$/, // Gmail / Apple Mail
  /^-{2,}\s*Original Message\s*-{2,}/i, // Outlook (classic)
  /^-{2,}\s*Forwarded message\s*-{2,}/i,
  /^_{5,}\s*$/, // Outlook web separator
  /^Sent from my (iPhone|iPad|Android|phone)/i,
  /^Get Outlook for (iOS|Android)/i,
];

/**
 * The new part of an email reply: everything before the quoted history
 * ("On … wrote:", "> " lines, Outlook headers) and before a "-- " signature.
 * Gmail wraps a long "On … wrote:" over two lines, so that is joined first.
 */
export function stripQuotedReply(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const joined = `${line} ${lines[i + 1] ?? ""}`.trim();
    if (line === "-- " || line === "--") break;
    if (QUOTE_HEADERS.some((re) => re.test(line.trim()))) break;
    if (/^On .{1,300}$/.test(line.trim()) && /wrote:\s*$/.test(joined)) break;
    // Outlook header block: "From: …" followed by "Sent:"/"Date:" within 3 lines.
    if (/^\*?From:\*?\s/.test(line.trim()) && lines.slice(i + 1, i + 4).some((l) => /^\*?(Sent|Date):/.test(l.trim()))) break;
    if (/^>/.test(line)) {
      // A quote block that runs to the end is history; a quote in the middle
      // (inline answers) stays.
      if (lines.slice(i).every((l) => /^>/.test(l) || !l.trim())) break;
    }
    out.push(line);
  }
  return out.join("\n").trim();
}

/**
 * Outbound messages a project may send from the inbox: every send is one
 * click, but the channels are the agency's (Telnyx number, alisamadii.com
 * mail), so a hijacked or scripted account can't turn them into a bulk relay.
 */
export const OUTBOUND_LIMITS = { perHour: 60, perDay: 300 } as const;

/**
 * Business name as an email display name: plain characters only, so the
 * From header can't carry another address, quotes or line breaks.
 */
export const senderDisplayName = (name: string) =>
  name
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N} .&'-]/gu, "")
    .replace(/ +/g, " ")
    .trim()
    .slice(0, 60) || "Message";
