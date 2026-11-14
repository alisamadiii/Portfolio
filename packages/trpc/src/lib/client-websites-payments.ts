import "server-only";

import { TRPCError } from "@trpc/server";
import type Stripe from "stripe";
import z from "zod";

import type { CatalogPrice, PaymentLink } from "./client-websites-shared";
import { stripe } from "./payment/stripe";

// ─── Client websites: Stripe Checkout links ──────────────────────
// Ali makes a payment link while showing a client their design. Sessions are
// tagged {source: "client-websites", slug} so they're found again by scanning
// (Stripe has no metadata filter on sessions) and ignored by stripe-sync.

const SOURCE = "client-websites";
const MAX_SESSIONS_SCANNED = 1000;
const API_BASE =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://api.alisamadii.com";

// Stripe rejects charges under $0.50.
const MIN_AMOUNT = 50;

const quantity = z.number().int().min(1).max(99);
const unitAmount = z.number().int().min(MIN_AMOUNT, "Each item must be at least $0.50.");

export const createLinkSchema = z.object({
  email: z.email(),
  name: z.string().trim().max(200).optional(),
  // Shown to the client on the checkout page.
  message: z.string().trim().max(1000).optional(),
  // Internal: stays on the Stripe session.
  note: z.string().trim().max(500).optional(),
  items: z
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
          interval: z.enum(["one_time", "month", "year"]),
          quantity,
          unitAmount,
        }),
      ])
    )
    .min(1, "Add at least one item.")
    .max(20),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;

// A problem the person filling in the form can fix: its message is shown as is.
const paymentError = (message: string) =>
  new TRPCError({ code: "BAD_REQUEST", message });

export const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

export async function listCatalog(): Promise<CatalogPrice[]> {
  const catalog: CatalogPrice[] = [];
  const prices = stripe.prices.list({ active: true, limit: 100, expand: ["data.product"] });
  for await (const price of prices) {
    const product = price.product as Stripe.Product | Stripe.DeletedProduct;
    if (product.deleted || !product.active) continue;
    // Other projects' products run hub logic on sale (Lead Finder credits,
    // Motion access). AGENCY ones are what gets sold here.
    const { project } = product.metadata;
    if (project && project !== "AGENCY") continue;
    // tiered and metered prices have no single amount to show or tweak
    if (price.unit_amount == null) continue;
    if (price.recurring && price.recurring.usage_type !== "licensed") continue;
    catalog.push({
      id: price.id,
      productId: product.id,
      productName: product.name,
      nickname: price.nickname,
      unitAmount: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval ?? null,
      intervalCount: price.recurring?.interval_count ?? 1,
    });
  }
  return catalog.sort(
    (a, b) => a.productName.localeCompare(b.productName) || a.unitAmount - b.unitAmount
  );
}

// list() is consistent but case-sensitive; search() ignores case but can lag
// about a minute behind a new customer. Between them neither case is missed.
export async function findCustomer(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  const { data } = await stripe.customers.list({ email, limit: 1 });
  if (data[0]) return data[0];
  const escaped = email.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const found = await stripe.customers.search({ query: `email:'${escaped}'`, limit: 1 });
  return found.data[0] ?? null;
}

const priceOf = (prices: Map<string, Stripe.Price>, id: string) => {
  const price = prices.get(id);
  if (!price) throw paymentError(`Price ${id} was not found in Stripe.`);
  return price;
};

// `prices` are fresh from Stripe: currency and recurrence are never taken
// from the browser.
const buildSessionParams = ({
  slug,
  input,
  customerId,
  prices,
}: {
  slug: string;
  input: CreateLinkInput;
  customerId: string;
  prices: Map<string, Stripe.Price>;
}): Stripe.Checkout.SessionCreateParams => {
  const currencies = new Set(
    input.items.flatMap((item) =>
      item.kind === "price" ? [priceOf(prices, item.priceId).currency] : []
    )
  );
  if (currencies.size > 1) throw paymentError("All items must use the same currency.");
  const currency = [...currencies][0] ?? "usd";
  const intervals = new Set<string>();

  const line_items = input.items.map((item): Stripe.Checkout.SessionCreateParams.LineItem => {
    const { quantity, unitAmount: unit_amount } = item;
    if (item.kind === "custom") {
      const recurring =
        item.interval === "one_time" ? undefined : { interval: item.interval, interval_count: 1 };
      if (recurring) intervals.add(`${recurring.interval}:1`);
      return {
        quantity,
        price_data: { currency, unit_amount, product_data: { name: item.name }, recurring },
      };
    }
    const price = priceOf(prices, item.priceId);
    const recurring = price.recurring
      ? { interval: price.recurring.interval, interval_count: price.recurring.interval_count }
      : undefined;
    if (recurring) intervals.add(`${recurring.interval}:${recurring.interval_count}`);
    if (unit_amount === price.unit_amount) return { price: price.id, quantity };
    // A tweaked price applies to this link only; the catalog stays as it is.
    const product = typeof price.product === "string" ? price.product : price.product.id;
    return { quantity, price_data: { currency, unit_amount, product, recurring } };
  });
  if (intervals.size > 1) {
    throw paymentError(
      "Stripe can't bill different intervals on one link. Use all monthly or all yearly."
    );
  }

  const metadata: Record<string, string> = { source: SOURCE, slug };
  if (input.note) metadata.note = input.note;
  const recurringLink = intervals.size > 0;

  return {
    mode: recurringLink ? "subscription" : "payment",
    customer: customerId,
    line_items,
    success_url: `${API_BASE}/client-websites/paid`,
    metadata,
    ...(input.message ? { custom_text: { submit: { message: input.message } } } : {}),
    ...(recurringLink
      ? { subscription_data: { metadata } }
      : { invoice_creation: { enabled: true, invoice_data: { metadata } } }),
  };
};

export async function createLink(slug: string, input: CreateLinkInput) {
  const ids = [
    ...new Set(input.items.flatMap((item) => (item.kind === "price" ? [item.priceId] : []))),
  ];
  const prices = new Map(
    await Promise.all(ids.map(async (id) => [id, await stripe.prices.retrieve(id)] as const))
  );
  // Built before the customer exists, so a rejected form leaves none behind.
  buildSessionParams({ slug, input, customerId: "pending", prices });

  const email = input.email.trim().toLowerCase();
  const customer =
    (await findCustomer(email)) ??
    (await stripe.customers.create({ email, name: input.name || undefined }));

  const session = await stripe.checkout.sessions.create(
    buildSessionParams({ slug, input, customerId: customer.id, prices })
  );
  return toPaymentLink(session, email);
}

export async function listLinks(slug: string) {
  const links: PaymentLink[] = [];
  let scanned = 0;
  const sessions = stripe.checkout.sessions.list({ limit: 100, expand: ["data.customer"] });
  for await (const session of sessions) {
    if (++scanned > MAX_SESSIONS_SCANNED) break;
    if (isOurs(session, slug)) links.push(toPaymentLink(session));
  }
  return links;
}

export async function expireLink(slug: string, id: string) {
  const session = await stripe.checkout.sessions.retrieve(id);
  if (!isOurs(session, slug)) throw paymentError("That link does not belong to this website.");
  await stripe.checkout.sessions.expire(id);
}

const isOurs = (session: Stripe.Checkout.Session, slug: string) =>
  session.metadata?.source === SOURCE && session.metadata.slug === slug;

const toPaymentLink = (session: Stripe.Checkout.Session, knownEmail?: string): PaymentLink => {
  const customer = session.customer;
  const customerEmail =
    customer && typeof customer === "object" && !customer.deleted ? customer.email : null;
  return {
    id: session.id,
    status:
      session.status === "complete"
        ? session.payment_status === "unpaid"
          ? "processing"
          : "paid"
        : session.status === "open"
          ? "open"
          : "expired",
    email: knownEmail ?? session.customer_details?.email ?? customerEmail,
    amountTotal: session.amount_total,
    currency: session.currency,
    recurring: session.mode === "subscription",
    createdAt: new Date(session.created * 1000).toISOString(),
    expiresAt: new Date(session.expires_at * 1000).toISOString(),
    url: session.status === "open" ? session.url : null,
    note: session.metadata?.note ?? null,
  };
};
