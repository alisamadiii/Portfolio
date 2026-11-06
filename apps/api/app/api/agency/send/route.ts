import { NextResponse } from "next/server";
import { z } from "zod";

import { sendEmail, UseSendError } from "@workspace/email/usesend";
import {
  isEmail,
  MAX_FIELDS,
  stripUrl,
} from "@workspace/trpc/lib/agency/lead-capture";
import { ALLOWED_ORIGINS } from "@workspace/trpc/lib/allow-origin";

// ─── Agency site form relay ─────────────────────────────────────
// Every form on alisamadii.com (quote, showcase request, free preview, ...)
// posts here and lands in Ali's inbox as one email. No Hub lead, no
// attribution cookie: just the fields, the form name and the page it came from.

const FROM = "Website <noreply@alisamadii.com>";
const TO = "a@alisamadii.com";

const corsHeaders = (req: Request) => {
  const origin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin":
      origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]!,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
};

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 200, headers: corsHeaders(req) });
}

// In-memory per-IP limit: best effort per instance.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

const isRateLimited = (ip: string) => {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  hits.set(ip, recent);
  return false;
};

const bodySchema = z.object({
  form: z.string().trim().min(1).max(100),
  fields: z
    .record(z.string().max(100), z.string().max(5000))
    .refine((f) => Object.keys(f).length <= MAX_FIELDS, "Too many fields"),
  pageUrl: z.string().max(2000).optional(),
  // honeypot: people never see it, bots fill it in
  hp: z.string().max(500).optional(),
});
type Body = z.infer<typeof bodySchema>;

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// "google_maps" -> "Google maps", "bestTime" -> "Best time"
const label = (key: string) => {
  const words = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const link = (href: string, text: string) =>
  `<a href="${escapeHtml(href)}" style="color:#fc8464;text-decoration:none;">${escapeHtml(text)}</a>`;

const valueHtml = (key: string, value: string) => {
  // cast keeps isEmail's type guard from narrowing value to never below
  if (isEmail(value as string | undefined)) return link(`mailto:${value}`, value);
  if (/phone|tel/i.test(key) && /^[\d\s()+.-]{7,}$/.test(value)) {
    return link(`tel:${value.replace(/[^\d+]/g, "")}`, value);
  }
  if (/^https?:\/\/\S+$/i.test(value)) return link(value, value);
  return escapeHtml(value).replaceAll("\n", "<br>");
};

const row = (name: string, value: string) => `
  <tr>
    <td style="padding:10px 16px;font:600 11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:0.08em;text-transform:uppercase;color:#a49d94;white-space:nowrap;vertical-align:top;border-bottom:1px solid #f1efec;">${escapeHtml(name)}</td>
    <td style="padding:10px 16px;font:400 14px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2b2926;border-bottom:1px solid #f1efec;">${value}</td>
  </tr>`;

const entries = (fields: Body["fields"]) =>
  Object.entries(fields)
    .map(([key, value]) => [key, value.trim()] as const)
    .filter(([, value]) => value);

const who = (fields: Body["fields"]) =>
  fields.name?.trim() || fields.business?.trim() || fields.email?.trim() || "someone";

const emailHtml = (data: Body, page: string | null) => {
  const rows = [
    ...entries(data.fields).map(([key, value]) => row(label(key), valueHtml(key, value))),
    page ? row("Page", link(page, page)) : "",
  ].join("");
  const replyTo = data.fields.email?.trim();

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f4f1;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4f1;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #eceae6;">
            <tr>
              <td style="padding:28px 32px 0;">
                <div style="font:600 11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:0.12em;text-transform:uppercase;color:#fc8464;">
                  &#9642; ${escapeHtml(data.form)}
                </div>
                <div style="margin-top:10px;font:600 22px/1.25 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;letter-spacing:-0.02em;color:#2b2926;">
                  New message from ${escapeHtml(who(data.fields))}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 16px ${isEmail(replyTo) ? "0" : "28px"};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f1efec;border-radius:12px;border-collapse:separate;overflow:hidden;">
                  ${rows}
                </table>
              </td>
            </tr>
            ${
              isEmail(replyTo)
                ? `<tr>
              <td style="padding:24px 32px 28px;">
                <a href="mailto:${escapeHtml(replyTo)}" style="display:inline-block;background:#2b2926;color:#faf6f2;font:500 14px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:13px 26px;border-radius:999px;text-decoration:none;">Reply to ${escapeHtml(who(data.fields))}</a>
              </td>
            </tr>`
                : ""
            }
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const emailText = (data: Body, page: string | null) =>
  [
    data.form,
    "",
    ...entries(data.fields).map(([key, value]) => `${label(key)}: ${value}`),
    page ? `Page: ${page}` : "",
  ]
    .filter((line, i) => line || i === 1)
    .join("\n");

export async function POST(req: Request) {
  const headers = corsHeaders(req);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400, headers });
  }
  const data = parsed.data;
  // Bots get the same success a person would, so they don't retry.
  if (data.hp) return NextResponse.json({ ok: true }, { headers });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a few minutes." },
      { status: 429, headers }
    );
  }

  const page = stripUrl(data.pageUrl);
  const replyTo = data.fields.email?.trim();
  try {
    await sendEmail({
      from: FROM,
      to: TO,
      ...(isEmail(replyTo) ? { replyTo } : {}),
      subject: `${data.form}: ${who(data.fields)}`,
      html: emailHtml(data, page),
      text: emailText(data, page),
    });
  } catch (error) {
    if (error instanceof UseSendError && error.status === 429) {
      return NextResponse.json(
        { error: "Too many requests. Try again in a few minutes." },
        { status: 429, headers }
      );
    }
    console.error("Agency form send failed", error);
    return NextResponse.json(
      { error: "Couldn't send your message. Please try again or email a@alisamadii.com." },
      { status: 500, headers }
    );
  }

  return NextResponse.json({ ok: true }, { headers });
}
