import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { z } from "zod";

import { ALLOWED_ORIGINS } from "@workspace/trpc/lib/allow-origin";
import { FEATURES, featureKeys } from "@workspace/trpc/lib/features";
import { stripe } from "@workspace/trpc/lib/stripe";
import { db } from "@workspace/drizzle/index";
import { user } from "@workspace/drizzle/schema";
import { urls } from "@workspace/ui/lib/company";

// Feature-gate checkout for the hub (e.g. per-project CMS subscription).
// The agency site's self-serve monthly/upfront checkout was removed — the
// agency now runs quote-only (see /api/agency/quote).

// ─── CORS ───────────────────────────────────────────────────────

const allowedOrigins = [...ALLOWED_ORIGINS];

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
  plan: z.enum(featureKeys),
  email: z.email().optional(),
  name: z.string().max(200).optional(),
  // Per-project CMS subscription: the webhook keys the subscription off
  // metadata.repoId, and reuses the user's Stripe customer to avoid dupes.
  repoId: z.number().int().positive().optional(),
  userId: z.string().max(200).optional(),
  // Feature purchases return the user to the page they were on.
  returnUrl: z.url().max(2000).optional(),
});

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
  const { plan, email, name, returnUrl, repoId, userId } = parsed.data;

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: FEATURES[plan].price, quantity: 1 },
  ];

  const metadata = {
    plan,
    name: name ?? "",
    // Per-project CMS subscription join keys (read back by the Stripe webhook).
    repoId: repoId ? String(repoId) : "",
    userId: userId ?? "",
  };

  // Reuse the user's existing Stripe customer so a user never spawns duplicate
  // customers across their multiple project subscriptions.
  let existingCustomerId: string | null = null;
  if (userId) {
    const [record] = await db
      .select({ stripeCustomerId: user.stripeCustomerId })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    existingCustomerId = record?.stripeCustomerId ?? null;
  }

  // Feature purchases bounce back to the page the user was on (e.g. the CMS
  // entry they tried to save).
  const validReturnUrl = validateReturnUrl(returnUrl);
  const featureBackUrl = validReturnUrl ?? urls.cms;
  const featureSuccessUrl = `${featureBackUrl}${featureBackUrl.includes("?") ? "&" : "?"}purchase=success`;

  try {
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: lineItems,
      // A known customer takes precedence; Stripe rejects both together.
      ...(existingCustomerId
        ? { customer: existingCustomerId }
        : { customer_email: email }),
      metadata,
      success_url: featureSuccessUrl,
      cancel_url: featureBackUrl,
      custom_text: {
        submit: {
          message: "Use the same email you sign in with — access is tied to it.",
        },
      },
      subscription_data: { metadata },
    };

    const session = await stripe.checkout.sessions.create(params);

    return NextResponse.json({ url: session.url }, { headers });
  } catch (error) {
    console.error("Feature checkout failed", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500, headers }
    );
  }
}
