import { NextResponse } from "next/server";
import { z } from "zod";

import { agency } from "@workspace/trpc/lib/agency";
import { ALLOWED_ORIGINS } from "@workspace/trpc/lib/allow-origin";

// ─── CORS ───────────────────────────────────────────────────────
// Live Server (static agency site during local dev) is not in the
// shared allowlist, so it's added here.

const allowedOrigins = [
  ...ALLOWED_ORIGINS,
  "http://127.0.0.1:5500",
  "http://localhost:5500",
];

const corsHeaders = (req: Request) => {
  const origin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin":
      origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0]!,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
};

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 200, headers: corsHeaders(req) });
}

// ─── Rate limit ─────────────────────────────────────────────────
// emails.send() has no per-IP limit (unlike sendContact), so guard this
// public endpoint ourselves. In-memory: best effort per serverless instance.

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

// ─── Quote request ──────────────────────────────────────────────
// Public "Get a Quote" form on the agency site. Renders a branded HTML
// notification and sends it via the agency email API to the studio inbox.

const FROM = "Free Quote <noreply@alisamadii.com>";
const TO = "agency@alisamadii.com";

const PLAN_LABELS = {
  waas: "Website-as-a-Service ($500 setup + $284/mo)",
  onetime: "Own-it build (priced per project)",
  ecommerce: "E-commerce Storefront (Shopify) — $1,500 setup + $120/mo",
  custom: "Custom / not sure",
} as const;

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.email(),
  message: z.string().min(1).max(2000),
  business: z.string().max(200).optional(),
  plan: z.enum(["waas", "onetime", "ecommerce", "custom"]).optional(),
  phone: z.string().max(40).optional(),
});

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const row = (label: string, value: string) => `
  <tr>
    <td style="padding:10px 16px;font:600 11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:0.08em;text-transform:uppercase;color:#a49d94;white-space:nowrap;vertical-align:top;border-bottom:1px solid #f1efec;">${label}</td>
    <td style="padding:10px 16px;font:400 14px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2b2926;border-bottom:1px solid #f1efec;">${value}</td>
  </tr>`;

const quoteEmailHtml = (data: z.infer<typeof bodySchema>) => {
  const rows = [
    row("Name", escapeHtml(data.name)),
    row(
      "Email",
      `<a href="mailto:${escapeHtml(data.email)}" style="color:#fc8464;text-decoration:none;">${escapeHtml(data.email)}</a>`
    ),
    data.plan ? row("Interested in", escapeHtml(PLAN_LABELS[data.plan])) : "",
    data.business ? row("Business", escapeHtml(data.business)) : "",
    data.phone
      ? row(
          "Phone",
          `<a href="tel:${escapeHtml(data.phone)}" style="color:#fc8464;text-decoration:none;">${escapeHtml(data.phone)}</a>`
        )
      : "",
  ].join("");

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
                  &#9642; New Quote Request
                </div>
                <div style="margin-top:10px;font:600 22px/1.25 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;letter-spacing:-0.02em;color:#2b2926;">
                  ${escapeHtml(data.name)} wants a quote
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 16px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f1efec;border-radius:12px;border-collapse:separate;overflow:hidden;">
                  ${rows}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0;">
                <div style="font:600 11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:0.08em;text-transform:uppercase;color:#a49d94;">Project details</div>
                <div style="margin-top:8px;padding:16px;background:#faf9f7;border:1px solid #f1efec;border-radius:12px;font:400 14px/1.7 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2b2926;white-space:pre-wrap;">${escapeHtml(data.message)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 28px;">
                <a href="mailto:${escapeHtml(data.email)}?subject=${encodeURIComponent(`Re: your quote request`)}" style="display:inline-block;background:#2b2926;color:#faf6f2;font:500 14px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:13px 26px;border-radius:999px;text-decoration:none;">Reply to ${escapeHtml(data.name)}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 26px;">
                <div style="border-top:1px solid #f1efec;padding-top:16px;font:400 12px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#a49d94;">
                  Sent from the Get a Quote form &middot; agency.alisamadii.com
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const quoteEmailText = (data: z.infer<typeof bodySchema>) =>
  [
    `New quote request`,
    ``,
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    data.plan ? `Interested in: ${PLAN_LABELS[data.plan]}` : "",
    data.business ? `Business: ${data.business}` : "",
    data.phone ? `Phone: ${data.phone}` : "",
    ``,
    `Project details:`,
    data.message,
  ]
    .filter(Boolean)
    .join("\n");

export async function POST(req: Request) {
  const headers = corsHeaders(req);

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests — try again in a few minutes." },
      { status: 429, headers }
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400, headers }
    );
  }
  const data = parsed.data;

  const { error } = await agency().emails.send({
    from: FROM,
    to: TO,
    subject: `New quote request from ${data.name}`,
    html: quoteEmailHtml(data),
    text: quoteEmailText(data),
    type: "quote",
  });

  if (error) {
    if (error.code === "RATE_LIMIT_EXCEEDED") {
      return NextResponse.json(
        { error: "Too many requests — try again in a few minutes." },
        { status: 429, headers }
      );
    }
    console.error("Agency quote request failed", error);
    return NextResponse.json(
      { error: "Failed to send quote request" },
      { status: 500, headers }
    );
  }

  return NextResponse.json({ ok: true }, { headers });
}
