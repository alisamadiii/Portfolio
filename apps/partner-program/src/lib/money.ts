import { program } from '../config';

/** $699 -> "$699", 279.6 -> "$279.60" */
export function money(n: number): string {
  const r = Math.round(n * 100) / 100;
  const cents = Math.abs(r % 1) > 0.001;
  return (
    '$' +
    r.toLocaleString('en-US', {
      minimumFractionDigits: cents ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}

const cents = (n: number) => Math.round(n * 100) / 100;

/** Estimated Stripe card fee on a payment: 2.9% + $0.30. */
export function cardFee(price: number): number {
  return price > 0 ? cents(price * program.cardFeeRate + program.cardFeeFixed) : 0;
}

/** Estimated payout: 20% of the price after the card fee. $699 -> $135.69 */
export function payoutFor(price: number): number {
  return Math.max(0, cents((price - cardFee(price)) * program.payoutRate));
}
