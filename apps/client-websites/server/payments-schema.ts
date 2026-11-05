import { z } from "zod";

// Stripe rejects charges under $0.50.
const MIN_AMOUNT = 50;

const quantity = z.number().int().min(1).max(99);
const unitAmount = z
  .number()
  .int()
  .min(MIN_AMOUNT, "Each item must be at least $0.50.");

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

export type CatalogPrice = {
  id: string;
  productId: string;
  productName: string;
  nickname: string | null;
  unitAmount: number;
  currency: string;
  // null = one-time
  interval: string | null;
  intervalCount: number;
};

export type PaymentLink = {
  id: string;
  // processing = checkout finished, money not in yet (bank payments take days)
  status: "open" | "processing" | "paid" | "expired";
  email: string | null;
  amountTotal: number | null;
  currency: string | null;
  recurring: boolean;
  createdAt: string;
  expiresAt: string;
  // only while the link is open
  url: string | null;
  note: string | null;
};
