import "server-only";

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import { hubProject, projectOffers, user } from "@workspace/drizzle/schema";
import { urls } from "@workspace/ui/lib/company";

import { planLabel, type PlanKey } from "./plans";
import { stripe } from "./stripe";

// ─── Client plans (admin-built, one per project) ─────────────────
// There is no public price: the admin sets a recurring price, an optional
// one-time initial payment and the feature set for one project, and gets a
// Stripe Payment Link to send (Payment Links never expire, Checkout Sessions
// do after 24h). The subscription it creates carries metadata
// { projectId, userId, plan }, so the webhook's project sync and the
// entitlement (metadata.plan for a custom price) work unchanged.

/** The tier every client plan grants (all features, see plans.ts). */
export const OFFER_PLAN = "agency:custom" as const satisfies PlanKey;

// Products carry this marker so catalog listings that filter on
// metadata.project (client-websites, saaskit) never show them.
const PRODUCT_MARKER = "CLIENT_PLAN";

const quantity = z.number().int().min(1).max(99);
// Stripe rejects charges under $0.50.
const unitAmount = z.number().int().min(50, "Each item must be at least $0.50.");

/** One line on a client plan: a catalog price (amount may be tweaked) or a custom item. */
export const offerItemsSchema = z
  .array(
    z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("price"),
        priceId: z.string().startsWith("price_"),
        quantity,
        unitAmount,
      }),
      z.object({
        kind: z.literal("custom"),
        name: z.string().trim().min(1).max(200),
        interval: z.enum(["one_time", "month"]),
        quantity,
        unitAmount,
      }),
    ])
  )
  .min(1, "Add at least one item.")
  .max(20);

export type OfferItems = z.infer<typeof offerItemsSchema>;

export type OfferInput = {
  projectId: string;
  name: string;
  items: OfferItems;
  createdBy: string;
};

const offerError = (message: string) => new TRPCError({ code: "BAD_REQUEST", message });

/** The project's open offer, or null. */
export async function openOffer(projectId: string) {
  const [offer] = await db
    .select()
    .from(projectOffers)
    .where(and(eq(projectOffers.projectId, projectId), eq(projectOffers.status, "open")))
    .limit(1);
  return offer ?? null;
}

/** Client-safe view of an offer (no Stripe ids). */
export const publicOffer = (offer: NonNullable<Awaited<ReturnType<typeof openOffer>>>) => ({
  id: offer.id,
  name: offer.name,
  plan: offer.plan,
  planLabel: planLabel(offer.plan as PlanKey),
  amount: offer.amount,
  interval: offer.interval,
  setupAmount: offer.setupAmount,
  items: offer.items,
  currency: offer.currency,
  url: offer.url,
  createdAt: offer.createdAt,
});

async function deactivate(offer: { stripePaymentLinkId: string }) {
  await stripe.paymentLinks
    .update(offer.stripePaymentLinkId, { active: false })
    .catch((error) => console.error("[offers] deactivate link failed", error));
}

/** Cancel the project's open offer (its link stops working). */
export async function cancelOpenOffer(projectId: string) {
  const offer = await openOffer(projectId);
  if (!offer) return false;
  await deactivate(offer);
  await db
    .update(projectOffers)
    .set({ status: "canceled" })
    .where(eq(projectOffers.id, offer.id));
  return true;
}

/**
 * Creates the Stripe prices + Payment Link for a client plan and stores it as
 * the project's open offer, replacing any previous open one. Catalog prices
 * are re-read from Stripe (amounts and recurrence never come from the
 * browser); tweaked or custom amounts get their own price on a product marked
 * CLIENT_PLAN, so catalog listings never show them.
 */
export async function createOffer(input: OfferInput) {
  const [project] = await db
    .select({
      owner: hubProject.githubConnectedUserId,
      repo: hubProject.repo,
      ownerEmail: user.email,
    })
    .from(hubProject)
    .leftJoin(user, eq(user.id, hubProject.githubConnectedUserId))
    .where(eq(hubProject.id, input.projectId))
    .limit(1);
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });

  const catalogIds = [
    ...new Set(input.items.flatMap((item) => (item.kind === "price" ? [item.priceId] : []))),
  ];
  const catalog = new Map(
    await Promise.all(
      catalogIds.map(async (id) => [id, await stripe.prices.retrieve(id)] as const)
    )
  );

  // Validate everything before creating anything in Stripe.
  const intervals = new Set<string>();
  const currencies = new Set<string>();
  for (const item of input.items) {
    if (item.kind === "custom") {
      if (item.interval !== "one_time") intervals.add(item.interval);
      continue;
    }
    const price = catalog.get(item.priceId);
    if (!price?.active) throw offerError(`Price ${item.priceId} isn't active in Stripe.`);
    currencies.add(price.currency);
    if (price.recurring) {
      if (price.recurring.interval !== "month" || price.recurring.interval_count !== 1) {
        throw offerError("Client plans bill monthly. Pick monthly or one-time products.");
      }
      intervals.add("month");
    }
  }
  if (currencies.size > 1) throw offerError("All items must use the same currency.");
  const currency = [...currencies][0] ?? "usd";
  const recurringLink = intervals.size > 0;

  const offerId = randomUUID();
  let customProduct: string | null = null;
  const productFor = async () =>
    (customProduct ??= (
      await stripe.products.create({
        name: input.name,
        metadata: { project: PRODUCT_MARKER, projectId: input.projectId, offerId },
      })
    ).id);

  const lineItems: { price: string; quantity: number }[] = [];
  const summary: { name: string; amount: number; quantity: number; interval: string }[] = [];
  for (const item of input.items) {
    if (item.kind === "custom") {
      const price = await stripe.prices.create({
        currency,
        unit_amount: item.unitAmount,
        product: await productFor(),
        nickname: item.name,
        ...(item.interval === "one_time" ? {} : { recurring: { interval: item.interval } }),
      });
      lineItems.push({ price: price.id, quantity: item.quantity });
      summary.push({
        name: item.name,
        amount: item.unitAmount,
        quantity: item.quantity,
        interval: item.interval,
      });
      continue;
    }
    const listed = catalog.get(item.priceId)!;
    const productId =
      typeof listed.product === "string" ? listed.product : listed.product.id;
    const name =
      typeof listed.product === "string"
        ? (await stripe.products.retrieve(productId)).name
        : "name" in listed.product
          ? listed.product.name
          : "Item";
    let priceId = listed.id;
    if (item.unitAmount !== listed.unit_amount) {
      // A tweaked price applies to this plan only; the catalog stays as it is.
      priceId = (
        await stripe.prices.create({
          currency,
          unit_amount: item.unitAmount,
          product: productId,
          metadata: { project: PRODUCT_MARKER, projectId: input.projectId, offerId },
          ...(listed.recurring ? { recurring: { interval: "month" as const } } : {}),
        })
      ).id;
    }
    lineItems.push({ price: priceId, quantity: item.quantity });
    summary.push({
      name,
      amount: item.unitAmount,
      quantity: item.quantity,
      interval: listed.recurring ? "month" : "one_time",
    });
  }

  // The project<->payment join key. userId is the project owner (the webhook
  // binds their Stripe customer); plan tells the entitlement what it unlocks.
  const metadata: Record<string, string> = {
    source: "hub-project",
    projectId: input.projectId,
    userId: project.owner ?? "",
    email: project.ownerEmail ?? "",
    name: project.repo,
    offerId,
    plan: OFFER_PLAN,
  };
  const link = await stripe.paymentLinks.create({
    line_items: lineItems,
    metadata,
    allow_promotion_codes: true,
    after_completion: {
      type: "redirect",
      redirect: { url: `${urls.cms}/p/${input.projectId}/billing?purchase=success` },
    },
    ...(recurringLink
      ? { subscription_data: { metadata } }
      : {
          payment_intent_data: { metadata },
          invoice_creation: { enabled: true, invoice_data: { metadata } },
        }),
  });

  const total = (recurring: boolean) =>
    summary
      .filter((line) => (line.interval !== "one_time") === recurring)
      .reduce((sum, line) => sum + line.amount * line.quantity, 0);

  await cancelOpenOffer(input.projectId);
  const [offer] = await db
    .insert(projectOffers)
    .values({
      id: offerId,
      projectId: input.projectId,
      plan: OFFER_PLAN,
      name: input.name,
      amount: total(true),
      interval: "month",
      setupAmount: total(false) || null,
      currency,
      items: summary,
      stripePaymentLinkId: link.id,
      url: link.url,
      createdBy: input.createdBy,
    })
    .returning();
  return offer!;
}

/**
 * Webhook side: a Payment Link checkout completed. Marks the matching open
 * offer paid and switches its link off so it can't be paid twice.
 */
export async function markOfferPaid(paymentLinkId: string) {
  const [offer] = await db
    .select()
    .from(projectOffers)
    .where(
      and(
        eq(projectOffers.stripePaymentLinkId, paymentLinkId),
        eq(projectOffers.status, "open")
      )
    )
    .limit(1);
  if (!offer) return;
  await deactivate(offer);
  await db
    .update(projectOffers)
    .set({ status: "paid", paidAt: new Date() })
    .where(eq(projectOffers.id, offer.id));
}
