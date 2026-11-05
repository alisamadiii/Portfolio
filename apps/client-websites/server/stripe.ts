import Stripe from "stripe";

import type {
  CatalogPrice,
  CreateLinkInput,
  PaymentLink,
} from "./payments-schema";

// Marks sessions made here: the Stripe account also serves the hub.
const SOURCE = "client-websites";
// Stripe has no metadata filter on sessions, so links are found by scanning.
const MAX_SESSIONS_SCANNED = 1000;

// A problem the person filling in the form can fix: its message is shown as is.
export class PaymentError extends Error {}

let cached: Stripe | null = null;

const stripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key)
    throw new PaymentError("STRIPE_SECRET_KEY is not set on the server.");
  cached ??= new Stripe(key);
  return cached;
};

export const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

export const listCatalog = async (): Promise<CatalogPrice[]> => {
  const catalog: CatalogPrice[] = [];
  const prices = stripe().prices.list({
    active: true,
    limit: 100,
    expand: ["data.product"],
  });
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
    (a, b) =>
      a.productName.localeCompare(b.productName) || a.unitAmount - b.unitAmount
  );
};

// list() is consistent but case-sensitive; search() ignores case but can lag
// about a minute behind a new customer. Between them neither case is missed.
export const findCustomer = async (rawEmail: string) => {
  const email = rawEmail.trim().toLowerCase();
  const { data } = await stripe().customers.list({ email, limit: 1 });
  if (data[0]) return data[0];
  const escaped = email.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const found = await stripe().customers.search({
    query: `email:'${escaped}'`,
    limit: 1,
  });
  return found.data[0] ?? null;
};

// Pure, so the Stripe rules can be tested without calling Stripe. `prices` are
// fresh from Stripe: currency and recurrence are never taken from the browser.
export const buildSessionParams = ({
  slug,
  input,
  customerId,
  prices,
  baseUrl,
}: {
  slug: string;
  input: CreateLinkInput;
  customerId: string;
  prices: Map<string, Stripe.Price>;
  baseUrl: string;
}): Stripe.Checkout.SessionCreateParams => {
  const currencies = new Set(
    input.items.flatMap((item) =>
      item.kind === "price" ? [priceOf(prices, item.priceId).currency] : []
    )
  );
  if (currencies.size > 1) {
    throw new PaymentError("All items must use the same currency.");
  }
  const currency = [...currencies][0] ?? "usd";
  const intervals = new Set<string>();

  const line_items = input.items.map(
    (item): Stripe.Checkout.SessionCreateParams.LineItem => {
      const { quantity, unitAmount: unit_amount } = item;
      if (item.kind === "custom") {
        const recurring =
          item.interval === "one_time"
            ? undefined
            : { interval: item.interval, interval_count: 1 };
        if (recurring) intervals.add(`${recurring.interval}:1`);
        return {
          quantity,
          price_data: {
            currency,
            unit_amount,
            product_data: { name: item.name },
            recurring,
          },
        };
      }
      const price = priceOf(prices, item.priceId);
      const recurring = price.recurring
        ? {
            interval: price.recurring.interval,
            interval_count: price.recurring.interval_count,
          }
        : undefined;
      if (recurring) {
        intervals.add(`${recurring.interval}:${recurring.interval_count}`);
      }
      if (unit_amount === price.unit_amount) {
        return { price: price.id, quantity };
      }
      // A tweaked price applies to this link only; the catalog stays as it is.
      const product =
        typeof price.product === "string" ? price.product : price.product.id;
      return {
        quantity,
        price_data: { currency, unit_amount, product, recurring },
      };
    }
  );
  if (intervals.size > 1) {
    throw new PaymentError(
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
    success_url: `${baseUrl}/paid`,
    metadata,
    ...(input.message
      ? { custom_text: { submit: { message: input.message } } }
      : {}),
    ...(recurringLink
      ? { subscription_data: { metadata } }
      : { invoice_creation: { enabled: true, invoice_data: { metadata } } }),
  };
};

const priceOf = (prices: Map<string, Stripe.Price>, id: string) => {
  const price = prices.get(id);
  if (!price) throw new PaymentError(`Price ${id} was not found in Stripe.`);
  return price;
};

export const createLink = async (
  slug: string,
  input: CreateLinkInput,
  baseUrl: string
) => {
  const ids = [
    ...new Set(
      input.items.flatMap((item) =>
        item.kind === "price" ? [item.priceId] : []
      )
    ),
  ];
  const prices = new Map(
    await Promise.all(
      ids.map(async (id) => [id, await stripe().prices.retrieve(id)] as const)
    )
  );
  // Built before the customer exists, so a rejected form leaves none behind.
  buildSessionParams({ slug, input, customerId: "pending", prices, baseUrl });

  const email = input.email.trim().toLowerCase();
  const customer =
    (await findCustomer(email)) ??
    (await stripe().customers.create({ email, name: input.name || undefined }));

  const session = await stripe().checkout.sessions.create(
    buildSessionParams({
      slug,
      input,
      customerId: customer.id,
      prices,
      baseUrl,
    })
  );
  return toPaymentLink(session, email);
};

export const listLinks = async (slug: string) => {
  const links: PaymentLink[] = [];
  let scanned = 0;
  const sessions = stripe().checkout.sessions.list({
    limit: 100,
    expand: ["data.customer"],
  });
  for await (const session of sessions) {
    if (++scanned > MAX_SESSIONS_SCANNED) break;
    if (isOurs(session, slug)) links.push(toPaymentLink(session));
  }
  return links;
};

export const expireLink = async (slug: string, id: string) => {
  const session = await stripe().checkout.sessions.retrieve(id);
  if (!isOurs(session, slug)) {
    throw new PaymentError("That link does not belong to this project.");
  }
  await stripe().checkout.sessions.expire(id);
};

const isOurs = (session: Stripe.Checkout.Session, slug: string) =>
  session.metadata?.source === SOURCE && session.metadata.slug === slug;

const toPaymentLink = (
  session: Stripe.Checkout.Session,
  knownEmail?: string
): PaymentLink => {
  const customer = session.customer;
  const customerEmail =
    customer && typeof customer === "object" && !customer.deleted
      ? customer.email
      : null;
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
