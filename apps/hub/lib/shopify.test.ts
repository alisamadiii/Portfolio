import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  normalizeShop,
  orderSearch,
  orderStatusGroup,
  signShopifyState,
  toAmount,
  toCents,
  verifyShopifyQueryHmac,
  verifyShopifyState,
  verifyShopifyWebhook,
} from "@workspace/trpc/lib/shopify-shared";
import { signUberState } from "@workspace/trpc/lib/uber-eats-shared";

import { fromShopifyOrder } from "@/components/orders/providers";
import { orderBadge } from "@/components/shopify/format";

const SECRET = "shpss_test_secret";

/** Signs a query the way Shopify does: every param but hmac, sorted, k=v joined with &, hex. */
const signQuery = (params: Record<string, string>, secret = SECRET) => {
  const message = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return new URLSearchParams({ ...params, hmac: createHmac("sha256", secret).update(message).digest("hex") });
};

describe("normalizeShop", () => {
  it("accepts a bare handle", () => {
    expect(normalizeShop("acme")).toBe("acme.myshopify.com");
  });
  it("accepts the myshopify domain, any case", () => {
    expect(normalizeShop("  Acme-Store.MyShopify.com ")).toBe("acme-store.myshopify.com");
  });
  it("accepts an admin URL", () => {
    expect(normalizeShop("https://acme.myshopify.com/admin/orders?x=1")).toBe("acme.myshopify.com");
  });
  it("rejects a myshopify lookalike with a trailing host", () => {
    expect(normalizeShop("acme.myshopify.com.evil.com")).toBeNull();
  });
  it("rejects a custom domain", () => {
    expect(normalizeShop("acme.com")).toBeNull();
  });
  it("rejects a leading hyphen", () => {
    expect(normalizeShop("-acme.myshopify.com")).toBeNull();
  });
  it("rejects empty and missing input", () => {
    expect(normalizeShop("")).toBeNull();
    expect(normalizeShop("   ")).toBeNull();
    expect(normalizeShop(null)).toBeNull();
  });
  it("rejects a userinfo trick", () => {
    expect(normalizeShop("https://evil.com@acme.myshopify.com")).toBeNull();
  });
});

describe("verifyShopifyQueryHmac", () => {
  const params = { code: "abc", shop: "acme.myshopify.com", state: "s.t", timestamp: "1700000000" };

  it("accepts a correctly signed query", () => {
    expect(verifyShopifyQueryHmac(signQuery(params), SECRET)).toBe(true);
  });
  it("doesn't depend on the order params arrive in", () => {
    const signed = signQuery(params);
    const shuffled = new URLSearchParams([
      ["timestamp", signed.get("timestamp")!],
      ["hmac", signed.get("hmac")!],
      ["state", signed.get("state")!],
      ["shop", signed.get("shop")!],
      ["code", signed.get("code")!],
    ]);
    expect(verifyShopifyQueryHmac(shuffled, SECRET)).toBe(true);
  });
  it("rejects a tampered param", () => {
    const signed = signQuery(params);
    signed.set("shop", "evil.myshopify.com");
    expect(verifyShopifyQueryHmac(signed, SECRET)).toBe(false);
  });
  it("rejects a missing hmac", () => {
    expect(verifyShopifyQueryHmac(new URLSearchParams(params), SECRET)).toBe(false);
  });
  it("rejects the wrong secret", () => {
    expect(verifyShopifyQueryHmac(signQuery(params, "other"), SECRET)).toBe(false);
  });
  it("rejects when no secret is configured", () => {
    expect(verifyShopifyQueryHmac(signQuery(params, ""), "")).toBe(false);
  });
  it("rejects a non-hex hmac", () => {
    const signed = signQuery(params);
    signed.set("hmac", "zz-not-hex");
    expect(verifyShopifyQueryHmac(signed, SECRET)).toBe(false);
  });
});

describe("verifyShopifyWebhook", () => {
  const body = JSON.stringify({ shop_id: 1, shop_domain: "acme.myshopify.com" });
  const sig = createHmac("sha256", SECRET).update(body, "utf8").digest("base64");

  it("accepts the base64 signature of the raw body", () => {
    expect(verifyShopifyWebhook(body, sig, SECRET)).toBe(true);
  });
  it("rejects a changed body", () => {
    expect(verifyShopifyWebhook(body + " ", sig, SECRET)).toBe(false);
  });
  it("rejects a missing header", () => {
    expect(verifyShopifyWebhook(body, null, SECRET)).toBe(false);
  });
  it("rejects when no secret is configured", () => {
    expect(verifyShopifyWebhook(body, sig, "")).toBe(false);
  });
  it("rejects a hex signature (Shopify webhooks are base64)", () => {
    const hex = createHmac("sha256", SECRET).update(body, "utf8").digest("hex");
    expect(verifyShopifyWebhook(body, hex, SECRET)).toBe(false);
  });
});

describe("Shopify connect state", () => {
  const data = { projectId: "p1", userId: "u1", shop: "acme.myshopify.com" };
  const now = Date.UTC(2026, 10, 19, 12);

  it("round-trips project, user and shop", () => {
    expect(verifyShopifyState(signShopifyState(data, "secret", now), "secret", now)).toMatchObject(data);
  });
  it("expires after 30 minutes", () => {
    const token = signShopifyState(data, "secret", now);
    expect(verifyShopifyState(token, "secret", now + 31 * 60_000)).toBeNull();
  });
  it("rejects the wrong secret", () => {
    expect(verifyShopifyState(signShopifyState(data, "secret", now), "other", now)).toBeNull();
  });
  it("rejects an Uber Eats state signed with the same secret", () => {
    const uber = signUberState({ projectId: "p1", userId: "u1" }, "secret", now);
    expect(verifyShopifyState(uber, "secret", now)).toBeNull();
  });
  it("rejects a token whose body was swapped", () => {
    const [, sig] = signShopifyState(data, "secret", now).split(".");
    const body = Buffer.from(JSON.stringify({ ...data, shop: "evil.myshopify.com", exp: now / 1000 + 600 })).toString("base64url");
    expect(verifyShopifyState(`${body}.${sig}`, "secret", now)).toBeNull();
  });
  it("rejects garbage", () => {
    expect(verifyShopifyState("nope", "secret", now)).toBeNull();
    expect(verifyShopifyState("", "secret", now)).toBeNull();
  });
});

describe("Shopify money", () => {
  it("reads decimal strings as cents", () => {
    expect(toCents({ amount: "12.50" })).toBe(1250);
    expect(toCents({ amount: "0.1" })).toBe(10);
    expect(toCents({ amount: "19.99" })).toBe(1999);
  });
  it("is null when Shopify sent nothing", () => {
    expect(toCents(null)).toBeNull();
    expect(toCents({ amount: "abc" })).toBeNull();
  });
  it("writes cents back as a 2-decimal amount", () => {
    expect(toAmount(1999)).toBe("19.99");
    expect(toAmount(500)).toBe("5.00");
  });
});

describe("Shopify order status", () => {
  const base = { cancelledAt: null, displayFinancialStatus: "PAID", displayFulfillmentStatus: "UNFULFILLED" };

  it("an unshipped paid order is open", () => {
    expect(orderStatusGroup(base)).toBe("open");
  });
  it("a partly shipped order is still open", () => {
    expect(orderStatusGroup({ ...base, displayFulfillmentStatus: "PARTIALLY_FULFILLED" })).toBe("open");
  });
  it("a shipped order is completed", () => {
    expect(orderStatusGroup({ ...base, displayFulfillmentStatus: "FULFILLED" })).toBe("completed");
  });
  it("a cancelled order is canceled even if it shipped", () => {
    expect(orderStatusGroup({ ...base, cancelledAt: "2026-11-01T00:00:00Z", displayFulfillmentStatus: "FULFILLED" })).toBe("canceled");
  });
  it("a fully refunded order is canceled", () => {
    expect(orderStatusGroup({ ...base, displayFinancialStatus: "REFUNDED" })).toBe("canceled");
  });
});

describe("orderSearch", () => {
  it("is empty with no filters", () => {
    expect(orderSearch({})).toBe("");
  });
  it("open = not cancelled, unshipped or partial", () => {
    expect(orderSearch({ status: "open" })).toBe("-status:cancelled (fulfillment_status:unshipped OR fulfillment_status:partial)");
  });
  it("adds the range start", () => {
    expect(orderSearch({ since: new Date("2026-11-01T05:00:00Z") })).toBe("created_at:>='2026-11-01T05:00:00.000Z'");
  });
  it("searches an order number by name", () => {
    expect(orderSearch({ text: "1024" })).toBe("name:#1024");
    expect(orderSearch({ text: "#1024" })).toBe("name:#1024");
  });
  it("strips quotes from free text so it can't break out of the query", () => {
    expect(orderSearch({ text: `mug' OR status:any "x` })).toBe("'mug OR status:any x'");
  });
});

describe("Shopify order on the shared Orders page", () => {
  const order = {
    id: "gid://shopify/Order/42",
    name: "#1001",
    placedAt: "2026-11-18T15:00:00Z",
    cancelledAt: null,
    financialStatus: "PAID",
    fulfillmentStatus: "UNFULFILLED",
    status: "open" as const,
    itemCount: 3,
    items: [
      { title: "Mug", quantity: 2 },
      { title: "Tee", quantity: 1 },
    ],
    totalCents: 4200,
    currency: "USD",
  };

  it("maps into a row with no customer name", () => {
    const row = fromShopifyOrder(order, "America/New_York");
    expect(row).toMatchObject({
      provider: "shopify",
      id: "gid://shopify/Order/42",
      displayId: "1001",
      customer: "Online order",
      itemsSummary: "2× Mug, 1× Tee",
      status: "open",
      stateLabel: "To ship",
      awaitingAccept: false,
    });
  });
  it("labels a cancelled order canceled before anything else", () => {
    expect(orderBadge({ ...order, cancelledAt: "2026-11-18T16:00:00Z", fulfillmentStatus: "FULFILLED" }).label).toBe("Canceled");
  });
  it("labels a refunded order refunded", () => {
    expect(orderBadge({ ...order, financialStatus: "REFUNDED" }).label).toBe("Refunded");
  });
  it("labels a shipped order shipped", () => {
    expect(orderBadge({ ...order, fulfillmentStatus: "FULFILLED", status: "completed" }).label).toBe("Shipped");
  });
});
