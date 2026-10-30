import { describe, expect, it } from "vitest";

import {
  planForPrice,
  priceIdVariants,
  pricesFor,
} from "@workspace/trpc/lib/payment/plans";

// The Billing plan card finds its Stripe product by the plan's price id. The
// DB mirror can hold the other Stripe mode's ids (live rows in the testing
// DB), so the lookup matches both twins.

describe("priceIdVariants", () => {
  it("returns the live and sandbox ids of the website plan", () => {
    const id = pricesFor("website:paid")!.recurring;
    // Deliberately updated (2026-10-30): the $100/mo ids were replaced by the
    // $25/mo price (live, sandbox). Updated again 2026-10-30 when the
    // sync script was removed and the ids were hardcoded.
    expect(priceIdVariants(id)).toEqual([
      "price_1UWD3rEhKQbL1BLmxW6K00PL",
      "price_1UWCvOEhKQbL1BLmIFadya35",
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

describe("planForPrice", () => {
  it("maps the $25/mo sandbox price to the website plan", () => {
    expect(planForPrice("price_1UWCvOEhKQbL1BLmIFadya35")).toBe(
      "website:paid"
    );
  });

  it("keeps the retired $100/mo prices on the website plan for old subscribers", () => {
    expect(planForPrice("price_1UMr7QEhKQbL1BLm2o3DHJ1P")).toBe("website:paid");
    expect(planForPrice("price_1UMoKjEhKQbL1BLm0xZuUQiw")).toBe("website:paid");
  });

  it("does not map an empty or unknown id", () => {
    expect(planForPrice("")).toBeNull();
    expect(planForPrice("price_unknown")).toBeNull();
  });
});
