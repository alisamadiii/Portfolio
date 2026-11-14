import { NextResponse } from "next/server";
import { createElement } from "react";
import { z } from "zod";

import AgencyFormEmail from "@workspace/email/emails/agency-form";
import { sendEmail, UseSendError } from "@workspace/email/usesend";
import { renderEmailParts } from "@workspace/email/utils";
import {
  isEmail,
  MAX_FIELDS,
  stripUrl,
} from "@workspace/trpc/lib/agency/lead-capture";
import { ALLOWED_ORIGINS } from "@workspace/trpc/lib/allow-origin";
import { attachFormReferral, referralLine } from "@workspace/trpc/lib/partners";

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

// "google_maps" -> "Google maps", "bestTime" -> "Best time"
const label = (key: string) => {
  const words = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

// Emails, phone numbers and URLs become links in the email.
const hrefFor = (key: string, value: string) => {
  // cast keeps isEmail's type guard from narrowing value to never below
  if (isEmail(value as string | undefined)) return `mailto:${value}`;
  if (/phone|tel/i.test(key) && /^[\d\s()+.-]{7,}$/.test(value)) {
    return `tel:${value.replace(/[^\d+]/g, "")}`;
  }
  if (/^https?:\/\/\S+$/i.test(value)) return value;
  return undefined;
};

const entries = (fields: Body["fields"]) =>
  Object.entries(fields)
    .map(([key, value]) => [key, value.trim()] as const)
    .filter(([, value]) => value);

const who = (fields: Body["fields"]) =>
  fields.name?.trim() || fields.business?.trim() || fields.email?.trim() || "someone";

const renderFormEmail = (data: Body, page: string | null) => {
  const replyTo = data.fields.email?.trim();
  return renderEmailParts(
    createElement(AgencyFormEmail, {
      form: data.form,
      who: who(data.fields),
      rows: [
        ...entries(data.fields).map(([key, value]) => ({
          label: label(key),
          value,
          href: hrefFor(key, value),
        })),
        ...(page ? [{ label: "Page", value: page, href: page }] : []),
      ],
      replyTo: isEmail(replyTo) ? replyTo : undefined,
    })
  );
};

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

  // Partner referral code (typed, or carried from ?ref=): attach the lead to
  // the partner. Never blocks the send; the email says who referred.
  const code = data.fields.referralCode?.trim();
  delete data.fields.referralCode;
  if (code) {
    const found = await attachFormReferral({
      code,
      businessName: data.fields.business,
      contactName: data.fields.name,
      email: data.fields.email,
      phone: data.fields.phone,
      notes: [`${data.form} form`, data.fields.message].filter(Boolean).join("\n\n"),
    });
    data.fields.referral = referralLine(code, found) ?? code;
  }

  const page = stripUrl(data.pageUrl);
  const replyTo = data.fields.email?.trim();
  try {
    await sendEmail({
      from: FROM,
      to: TO,
      ...(isEmail(replyTo) ? { replyTo } : {}),
      subject: `${data.form}: ${who(data.fields)}`,
      ...(await renderFormEmail(data, page)),
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
