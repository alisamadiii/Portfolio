import { describe, expect, it } from "vitest";

import { priceIdVariants, pricesFor } from "@workspace/trpc/lib/payment/plans";

// The Billing plan card finds its Stripe product by the plan's price id. The
// DB mirror can hold the other Stripe mode's ids (live rows in the testing
// DB), so the lookup matches both twins.

describe("priceIdVariants", () => {
  it("returns the live and sandbox ids of the website plan", () => {
    const id = pricesFor("website:paid")!.recurring;
    expect(priceIdVariants(id)).toEqual([
      "price_1UMr7QEhKQbL1BLm2o3DHJ1P",
      "price_1UMoKjEhKQbL1BLm0xZuUQiw",
    ]);
  });

  it("never resolves the website plan to the agency product's price", () => {
    const website = priceIdVariants(pricesFor("website:paid")!.recurring);
    const agency = priceIdVariants(pricesFor("agency:launch")!.recurring);
    expect(website.some((id) => agency.includes(id))).toBe(false);
  });

  it("passes an unknown id through", () => {
    expect(priceIdVariants("price_unknown")).toEqual(["price_unknown"]);
  });
});
