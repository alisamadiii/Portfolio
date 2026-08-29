// Server-side GA4 via the Measurement Protocol — purchase events for the
// Monetization reports. Fire-and-forget: never throws, so callers (Stripe
// webhook) can't 500 over analytics.
import { GA_MEASUREMENT_ID } from "./config";

type PurchaseItem = { item_name: string; price: number; quantity: number };

export async function trackPurchase(p: {
  /** Stripe customer id — stable per client, GA groups purchases by it. */
  clientId: string;
  /** Checkout session id or invoice id — GA4 dedupes on this. */
  transactionId: string;
  /** Dollars (Stripe amount / 100). */
  value: number;
  currency: string;
  items: PurchaseItem[];
}): Promise<void> {
  const secret = process.env.GA_API_SECRET;
  if (!secret) return; // not configured — silent no-op
  try {
    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${secret}`,
      {
        method: "POST",
        body: JSON.stringify({
          client_id: p.clientId,
          events: [
            {
              name: "purchase",
              params: {
                transaction_id: p.transactionId,
                value: p.value,
                currency: p.currency.toUpperCase(),
                items: p.items,
              },
            },
          ],
        }),
      },
    );
  } catch {
    // analytics must never break the payment path
  }
}
