import { eq, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { leadCreditLedger } from "@workspace/drizzle/schema";

export const SIGNUP_CREDITS = 25;

export async function getCreditBalance(userId: string): Promise<number> {
  const [row] = await db
    .select({
      balance: sql<number>`coalesce(sum(${leadCreditLedger.delta}), 0)`,
    })
    .from(leadCreditLedger)
    .where(eq(leadCreditLedger.userId, userId));
  return Number(row?.balance ?? 0);
}

// Lazy signup grant — safe to call on every request; the partial unique
// index on (reason, refId) makes it a no-op after the first insert.
export async function ensureSignupGrant(userId: string): Promise<void> {
  await db
    .insert(leadCreditLedger)
    .values({
      userId,
      delta: SIGNUP_CREDITS,
      reason: "signup",
      refId: userId,
    })
    .onConflictDoNothing();
}

export async function grantPurchaseCredits(opts: {
  userId: string;
  credits: number;
  invoiceId: string;
}): Promise<void> {
  await db
    .insert(leadCreditLedger)
    .values({
      userId: opts.userId,
      delta: opts.credits,
      reason: "purchase",
      refId: opts.invoiceId,
    })
    .onConflictDoNothing();
}

// Subscription billing: every paid cycle RESETS the balance to the tier's
// allowance (no rollover). One ledger row per invoice (idempotent via the
// partial unique index); delta is whatever bridges current balance to the
// allowance, so it can be negative after a downgrade or an unspent month.
export async function resetCreditsToAllowance(opts: {
  userId: string;
  allowance: number;
  invoiceId: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${opts.userId}))`
    );
    const [row] = await tx
      .select({
        balance: sql<number>`coalesce(sum(${leadCreditLedger.delta}), 0)`,
      })
      .from(leadCreditLedger)
      .where(eq(leadCreditLedger.userId, opts.userId));
    const balance = Number(row?.balance ?? 0);
    await tx
      .insert(leadCreditLedger)
      .values({
        userId: opts.userId,
        delta: opts.allowance - balance,
        reason: "reset",
        refId: opts.invoiceId,
      })
      .onConflictDoNothing();
  });
}

// Refund claws the credits back; balance may go negative (abuse visibility).
export async function revokePurchaseCredits(opts: {
  userId: string;
  credits: number;
  invoiceId: string;
}): Promise<void> {
  await db
    .insert(leadCreditLedger)
    .values({
      userId: opts.userId,
      delta: -opts.credits,
      reason: "refund",
      refId: opts.invoiceId,
    })
    .onConflictDoNothing();
}

// Atomic debit: the per-user advisory lock serializes concurrent scans/unlocks
// so the summed balance can never be spent twice.
export async function debitCredits(opts: {
  userId: string;
  amount: number;
  reason: "scan" | "unlock";
  refId: string;
}): Promise<{ ok: true } | { ok: false; balance: number }> {
  if (opts.amount <= 0) return { ok: true };

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${opts.userId}))`
    );
    const [row] = await tx
      .select({
        balance: sql<number>`coalesce(sum(${leadCreditLedger.delta}), 0)`,
      })
      .from(leadCreditLedger)
      .where(eq(leadCreditLedger.userId, opts.userId));
    const balance = Number(row?.balance ?? 0);

    if (balance < opts.amount) return { ok: false as const, balance };

    await tx.insert(leadCreditLedger).values({
      userId: opts.userId,
      delta: -opts.amount,
      reason: opts.reason,
      refId: opts.refId,
    });
    return { ok: true as const };
  });
}
