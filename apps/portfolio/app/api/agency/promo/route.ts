import { NextResponse } from "next/server";
import { z } from "zod";

import { ALLOWED_ORIGINS } from "@workspace/trpc/lib/allow-origin";
import { stripe } from "@workspace/trpc/lib/stripe";

// ─── CORS ───────────────────────────────────────────────────────
// Mirrors apps/portfolio/app/api/agency/checkouts/route.ts — the static
// agency site (Live Server) is not in the shared allowlist during dev.

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

// ─── Promo code validation ──────────────────────────────────────

const bodySchema = z.object({
  code: z.string().min(1).max(64),
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
  const { code } = parsed.data;

  try {
    const promos = await stripe.promotionCodes.list({
      code,
      active: true,
      limit: 1,
      expand: ["data.promotion.coupon.applies_to"],
    });
    const pc = promos.data[0];
    const coupon =
      pc && typeof pc.promotion.coupon === "object" ? pc.promotion.coupon : null;
    if (!pc || !coupon) {
      return NextResponse.json({ valid: false }, { headers });
    }

    const productIds = coupon.applies_to?.products ?? [];
    // No product restriction ⇒ the code applies to the whole order.
    const appliesToAll = productIds.length === 0;

    // Normalized row keys the agency UI understands.
    const keyForProduct = (name: string) => {
      if (/host/i.test(name)) return "hosting";
      if (/cms/i.test(name)) return "cms";
      return "upfront";
    };

    // Resolve human-readable product names (same pattern as
    // packages/trpc/src/routers/stripe/payments.ts fetchSubscriptionsForCustomer).
    const products = appliesToAll
      ? []
      : (
          await Promise.all(
            productIds.map(async (id) => {
              try {
                const product = await stripe.products.retrieve(id);
                return product.name ?? null;
              } catch {
                return null;
              }
            })
          )
        ).filter((name): name is string => Boolean(name));

    return NextResponse.json(
      {
        valid: true,
        code: pc.code,
        discount: {
          percentOff: coupon.percent_off ?? null,
          amountOff: coupon.amount_off ?? null, // in the smallest currency unit
          currency: coupon.currency ?? null,
          // "once" (first invoice), "forever", or "repeating" (N months)
          duration: coupon.duration ?? "once",
          durationInMonths: coupon.duration_in_months ?? null,
        },
        appliesToAll,
        appliesTo: appliesToAll ? [] : [...new Set(products.map(keyForProduct))],
        products,
        // Optional personal note set on the promotion code's metadata.
        message: pc.metadata?.message?.slice(0, 500) ?? null,
      },
      { headers }
    );
  } catch (error) {
    console.error("Agency promo validation failed", error);
    return NextResponse.json(
      { error: "Failed to validate promo code" },
      { status: 500, headers }
    );
  }
}
