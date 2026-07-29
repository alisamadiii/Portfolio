import { NextResponse } from "next/server";
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
    }
  : {
      monthly: "price_1Tyd3SG7Gvayjjm6jbNbcyMp",
      hosting: "price_1Tyd2yG7Gvayjjm6l7mxEc9b",
      cms: "price_1Tyd17G7Gvayjjm6n0EijMTm",
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
  ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
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
  hosting: z.boolean().optional(),
  cms: z.boolean().optional(),
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
  const { plan, email, name, company, project, hosting, cms } = parsed.data;

  const lineItems: { price: string; quantity: number }[] = [];
  if (plan === "monthly") {
    lineItems.push({ price: PRICE_IDS.monthly, quantity: 1 });
  } else {
    if (hosting) lineItems.push({ price: PRICE_IDS.hosting, quantity: 1 });
    if (cms) lineItems.push({ price: PRICE_IDS.cms, quantity: 1 });
  }
  if (lineItems.length === 0) {
    return NextResponse.json(
      { error: "No add-ons selected — nothing to check out" },
      { status: 400, headers }
    );
  }

  const metadata = {
    plan,
    name: name ?? "",
    company: company ?? "",
    project: project?.slice(0, 500) ?? "",
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: lineItems,
      customer_email: email,
      metadata,
      subscription_data: { metadata },
      success_url: `${PORTAL_URL}/?checkout=success`,
      cancel_url: `${AGENCY_URL}/${plan === "monthly" ? "estimate" : "onboarding"}.html`,
      custom_text: {
        submit: {
          message:
            "Use the same email you'll use to sign in to your client portal at portal.alisamadii.com.",
        },
      },
    });

    return NextResponse.json({ url: session.url }, { headers });
  } catch (error) {
    console.error("Agency checkout failed", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500, headers }
    );
  }
}
