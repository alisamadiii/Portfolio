import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";

import { ALLOWED_ORIGINS } from "@workspace/trpc/lib/allow-origin";
import { stripe } from "@workspace/trpc/lib/stripe";

// ─── Stripe Price IDs — production vs sandbox ───────────────────
// Edit these when prices change. Sandbox (test mode) IDs are used
// everywhere except the production deployment.

const IS_PROD = process.env.VERCEL_ENV === "production";

const PRICE_IDS = IS_PROD
  ? {
      monthly: "price_1Tyd6g9sfDE02XZJuxFwcPEE", // $284/mo all-inclusive
      hosting: "price_1Tyd6i9sfDE02XZJdfIqq1zE", // $20/mo managed hosting
      cms: "price_1Tyd6l9sfDE02XZJd6PKJT1v", // $30/mo CMS access
      upfrontBase: "price_1TzSCw9sfDE02XZJGMWUjnRt", // TODO: replace — agency_upfront_base ($500 one-time)
      upfrontPage: "price_1TzSCw9sfDE02XZJPm94tRDX", // TODO: replace — agency_upfront_page ($200 one-time)
    }
  : {
      monthly: "price_1Tyd3SG7Gvayjjm6jbNbcyMp",
      hosting: "price_1Tyd2yG7Gvayjjm6l7mxEc9b",
      cms: "price_1Tyd17G7Gvayjjm6n0EijMTm",
      upfrontBase: "price_1TzPXlG7Gvayjjm6QCwM8VHK", // agency_upfront_base ($500 one-time)
      upfrontPage: "price_1TzPYiG7Gvayjjm6nFI2d59S", // agency_upfront_page ($200 one-time)
    };

const AGENCY_URL = "https://agency.alisamadii.com";
const PORTAL_URL = "https://portal.alisamadii.com";

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

// ─── Checkout ───────────────────────────────────────────────────

const bodySchema = z.object({
  plan: z.enum(["monthly", "upfront"]),
  email: z.email().optional(),
  name: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  project: z.string().max(2000).optional(),
  pages: z.number().int().min(1).max(100).optional(),
  hosting: z.boolean().optional(),
  cms: z.boolean().optional(),
  promotionCode: z.string().max(64).optional(),
});

export async function POST(req: Request) {
  const headers = corsHeaders(req);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400, headers }
    );
  }
  const {
    plan,
    email,
    name,
    company,
    project,
    pages,
    hosting,
    cms,
    promotionCode,
  } = parsed.data;

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  if (plan === "monthly") {
    lineItems.push({ price: PRICE_IDS.monthly, quantity: 1 });
  } else {
    const pageCount = pages ?? 1;
    // Base fee covers the first page; extra pages are a separate one-time
    // price the client can still adjust on Stripe's checkout page.
    lineItems.push({ price: PRICE_IDS.upfrontBase, quantity: 1 });
    if (pageCount > 1) {
      lineItems.push({
        price: PRICE_IDS.upfrontPage,
        quantity: pageCount - 1,
        adjustable_quantity: { enabled: true, minimum: 0 },
      });
    }
    if (hosting) lineItems.push({ price: PRICE_IDS.hosting, quantity: 1 });
    if (cms) lineItems.push({ price: PRICE_IDS.cms, quantity: 1 });
  }

  // Subscription mode when any recurring item is present; the one-time
  // upfront then rides the first invoice. Otherwise a plain payment.
  const hasRecurring = plan === "monthly" || !!hosting || !!cms;
  const mode: Stripe.Checkout.SessionCreateParams.Mode = hasRecurring
    ? "subscription"
    : "payment";

  const metadata = {
    plan,
    name: name ?? "",
    company: company ?? "",
    project: project?.slice(0, 500) ?? "",
    pages: plan === "upfront" ? String(pages ?? 1) : "",
  };

  // Re-resolve the promo code server-side before trusting it.
  let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
  if (promotionCode) {
    try {
      const promos = await stripe.promotionCodes.list({
        code: promotionCode,
        active: true,
        limit: 1,
      });
      const pc = promos.data[0];
      if (pc) discounts = [{ promotion_code: pc.id }];
    } catch (error) {
      console.error("Agency checkout promo lookup failed", error);
    }
  }

  try {
    const params: Stripe.Checkout.SessionCreateParams = {
      mode,
      line_items: lineItems,
      customer_email: email,
      metadata,
      success_url: `${PORTAL_URL}/?checkout=success`,
      cancel_url: `${AGENCY_URL}/${plan === "monthly" ? "estimate" : "onboarding"}.html`,
      custom_text: {
        submit: {
          message:
            "Use the same email you'll use to sign in to your client portal at portal.alisamadii.com.",
        },
      },
    };
    if (mode === "subscription") params.subscription_data = { metadata };
    if (discounts) params.discounts = discounts;

    const session = await stripe.checkout.sessions.create(params);

    return NextResponse.json({ url: session.url }, { headers });
  } catch (error) {
    console.error("Agency checkout failed", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500, headers }
    );
  }
}
