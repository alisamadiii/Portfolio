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

export function payoutFor(price: number): number {
  return Math.round(price * program.payoutRate * 100) / 100;
}
