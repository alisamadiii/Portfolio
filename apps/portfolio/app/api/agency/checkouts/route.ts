import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";

import { ALLOWED_ORIGINS } from "@workspace/trpc/lib/allow-origin";
import { FEATURES, featureKeys, PRICE_IDS } from "@workspace/trpc/lib/features";
import { stripe } from "@workspace/trpc/lib/stripe";
import { urls } from "@workspace/ui/lib/company";

const AGENCY_URL = "https://agency.alisamadii.com";
const PORTAL_URL = urls.portal; // localhost:3006 in dev

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
  // Feature keys ("cms", …) buy a single gated feature's subscription.
  plan: z.enum(["monthly", "upfront", ...featureKeys]),
  email: z.email().optional(),
  name: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  project: z.string().max(2000).optional(),
  pages: z.number().int().min(1).max(100).optional(),
  hosting: z.boolean().optional(),
  cms: z.boolean().optional(),
  promotionCode: z.string().max(64).optional(),
  // Feature purchases return the user to the page they were on.
  returnUrl: z.url().max(2000).optional(),
});

const isFeaturePlan = (plan: string): plan is keyof typeof FEATURES =>
  plan in FEATURES;

// Only redirect back to our own apps.
const validateReturnUrl = (returnUrl: string | undefined) => {
  if (!returnUrl) return null;
  try {
    const origin = new URL(returnUrl).origin;
    return allowedOrigins.includes(origin) ? returnUrl : null;
  } catch {
    return null;
  }
};

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
    returnUrl,
  } = parsed.data;

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  if (isFeaturePlan(plan)) {
    lineItems.push({ price: FEATURES[plan].price, quantity: 1 });
  } else if (plan === "monthly") {
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
  const hasRecurring =
    plan === "monthly" || isFeaturePlan(plan) || !!hosting || !!cms;
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

  // Feature purchases bounce back to the page the user was on (e.g. the CMS
  // entry they tried to save); agency plans go through the portal welcome page.
  const validReturnUrl = validateReturnUrl(returnUrl);
  const featureBackUrl = validReturnUrl ?? urls.cms;
  const featureSuccessUrl = `${featureBackUrl}${featureBackUrl.includes("?") ? "&" : "?"}purchase=success`;

  try {
    const params: Stripe.Checkout.SessionCreateParams = {
      mode,
      line_items: lineItems,
      customer_email: email,
      metadata,
      success_url: isFeaturePlan(plan)
        ? featureSuccessUrl
        : `${PORTAL_URL}/agency/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: isFeaturePlan(plan)
        ? featureBackUrl
        : `${AGENCY_URL}/${plan === "monthly" ? "prizink" : "onboarding"}.html`,
      custom_text: {
        submit: {
          message: isFeaturePlan(plan)
            ? "Use the same email you sign in with — access is tied to it."
            : "Use the same email you'll use to sign in to your client portal at portal.alisamadii.com.",
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
