import { NextResponse } from "next/server";
import { createElement } from "react";
import { z } from "zod";

import QuoteRequestEmail from "@workspace/email/emails/quote-request";
import { sendEmail, UseSendError } from "@workspace/email/usesend";
import { renderEmailParts } from "@workspace/email/utils";
import { ALLOWED_ORIGINS } from "@workspace/trpc/lib/allow-origin";

import { clientIp, isRateLimited } from "@/lib/agency-public";

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
// Guard this public endpoint per IP ourselves.
// In-memory: best effort per serverless instance.

const RATE_LIMIT = 5; // per IP per 10 minutes (shared Postgres window)

// ─── Quote request ──────────────────────────────────────────────
// Public "Get a Quote" form on the agency site. Renders the quote-request
// React Email template (packages/email) and sends it via useSend to the studio inbox.

const FROM = "Free Quote <noreply@alisamadii.com>";
const TO = "a@alisamadii.com";

const PLAN_LABELS = {
  launch: "Launch: website + Google Ads ($2,500/mo)",
  growth: "Growth: website + Google Ads ($3,500/mo)",
  scale: "Scale: website + Google Ads ($4,500/mo)",
  website: "Website only, no ads: $699 setup + $25/mo",
  ecommerce: "E-commerce Storefront (Shopify): $799 setup + $25/mo",
  newsletter: "Newsletter (quoted)",
  custom: "Custom / not sure",
} as const;

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.email(),
  message: z.string().min(1).max(2000),
  business: z.string().max(200).optional(),
  plan: z
    .enum(["launch", "growth", "scale", "website", "ecommerce", "newsletter", "custom"])
    .optional(),
  phone: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  const headers = corsHeaders(req);

  const ip = clientIp(req);
  if (await isRateLimited(`quote:${ip}`, RATE_LIMIT)) {
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

  try {
    await sendEmail({
      from: FROM,
      to: TO,
      replyTo: data.email,
      subject: `New quote request from ${data.name}`,
      ...(await renderEmailParts(
        createElement(QuoteRequestEmail, {
          name: data.name,
          email: data.email,
          message: data.message,
          business: data.business,
          plan: data.plan ? PLAN_LABELS[data.plan] : undefined,
          phone: data.phone,
        })
      )),
    });
  } catch (error) {
    if (error instanceof UseSendError && error.status === 429) {
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
