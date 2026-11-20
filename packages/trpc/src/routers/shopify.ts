import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/pool";
import { hubShopifyStore } from "@workspace/drizzle/schema";

import { cmsFullAccessProcedure, cmsProcedure, createTRPCRouter } from "../init";
import { requireApp } from "../lib/payment/entitlements";
import {
  assertNoUserErrors,
  idempotencyKey,
  isShopifyConfigured,
  deleteShopifyRows,
  shopifyAuthorizeUrl,
  shopifyGql,
  shopifyStoreFor,
  toTRPC,
} from "../lib/shopify";
import {
  normalizeShop,
  orderSearch,
  orderStatusGroup,
  signShopifyState,
  toAmount,
  toCents,
  type ShopifyMoney,
} from "../lib/shopify-shared";
import { localDateIn, localDayStart } from "../lib/uber-eats-shared";
import { rateLimit } from "../middleware/rate-limit";

// Shopify app: the owner connects their shop through Shopify's OAuth
// (apps/api /api/shopify/callback finishes it). Orders and products are read
// live from the Admin GraphQL API and never stored. No customer names,
// emails or addresses are requested: the app has no protected customer data.
const rangeDays = z.union([z.literal(7), z.literal(28), z.literal(90)]);

const appGate = <T extends { user: { email: string; role?: string | null }; projectId: string }>(ctx: T) =>
  requireApp(ctx.user, ctx.projectId, "shopify");
const appCmsProcedure = cmsProcedure.use(async ({ ctx, next }) => {
  await appGate(ctx);
  return next();
});
const appCmsFullAccessProcedure = cmsFullAccessProcedure.use(async ({ ctx, next }) => {
  await appGate(ctx);
  return next();
});

// Writes change the client's live shop.
const WRITE_LIMIT = { max: 60, windowMs: 10 * 60 * 1000, scope: "shopify" };
// Summary pages through up to this many orders; past it the KPIs say so.
const SUMMARY_CAP = 2000;

const notConfigured = () =>
  new TRPCError({ code: "PRECONDITION_FAILED", message: "Shopify isn't set up yet. Contact support." });

const needStore = async (projectId: string) => {
  const store = await shopifyStoreFor(projectId);
  if (!store) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Connect your Shopify store first." });
  if (!isShopifyConfigured()) throw notConfigured();
  return store;
};

const writeLimit = () => rateLimit(WRITE_LIMIT.max, WRITE_LIMIT.windowMs, WRITE_LIMIT.scope);

type Money = { shopMoney: ShopifyMoney } | null;
const cents = (m: Money) => toCents(m?.shopMoney);

// ─── GraphQL ─────────────────────────────────────────────────────

const ORDER_ROW = /* GraphQL */ `
  fragment OrderRow on Order {
    id
    name
    createdAt
    cancelledAt
    displayFinancialStatus
    displayFulfillmentStatus
    currentSubtotalLineItemsQuantity
    currentTotalPriceSet {
      shopMoney {
        amount
        currencyCode
      }
    }
    lineItems(first: 5) {
      nodes {
        title
        currentQuantity
      }
    }
  }
`;

type OrderRowNode = {
  id: string;
  name: string;
  createdAt: string;
  cancelledAt: string | null;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string;
  currentSubtotalLineItemsQuantity: number;
  currentTotalPriceSet: Money;
  lineItems: { nodes: { title: string; currentQuantity: number }[] };
};

type PageInfo = { hasNextPage: boolean; endCursor: string | null };

const ORDERS_QUERY = /* GraphQL */ `
  ${ORDER_ROW}
  query Orders($first: Int!, $after: String, $query: String) {
    orders(first: $first, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
      nodes {
        ...OrderRow
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const SUMMARY_QUERY = /* GraphQL */ `
  query OrderTotals($after: String, $query: String) {
    orders(first: 250, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
      nodes {
        createdAt
        currentTotalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const ORDER_QUERY = /* GraphQL */ `
  query Order($id: ID!) {
    order(id: $id) {
      id
      name
      createdAt
      processedAt
      cancelledAt
      cancelReason
      closedAt
      displayFinancialStatus
      displayFulfillmentStatus
      refundable
      tags
      currentSubtotalLineItemsQuantity
      subtotalPriceSet { shopMoney { amount currencyCode } }
      totalShippingPriceSet { shopMoney { amount currencyCode } }
      totalTaxSet { shopMoney { amount currencyCode } }
      totalDiscountsSet { shopMoney { amount currencyCode } }
      totalRefundedSet { shopMoney { amount currencyCode } }
      currentTotalPriceSet { shopMoney { amount currencyCode } }
      shippingLine { title }
      lineItems(first: 100) {
        nodes {
          id
          title
          variantTitle
          sku
          quantity
          currentQuantity
          originalUnitPriceSet { shopMoney { amount currencyCode } }
          discountedTotalSet { shopMoney { amount currencyCode } }
        }
      }
      fulfillments(first: 20) {
        createdAt
        status
        trackingInfo(first: 5) {
          company
          number
          url
        }
      }
      fulfillmentOrders(first: 20) {
        nodes {
          id
          status
          supportedActions {
            action
          }
        }
      }
    }
  }
`;

type OrderDetailNode = {
  id: string;
  name: string;
  createdAt: string;
  processedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  closedAt: string | null;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string;
  refundable: boolean;
  tags: string[];
  currentSubtotalLineItemsQuantity: number;
  subtotalPriceSet: Money;
  totalShippingPriceSet: Money;
  totalTaxSet: Money;
  totalDiscountsSet: Money;
  totalRefundedSet: Money;
  currentTotalPriceSet: Money;
  shippingLine: { title: string } | null;
  lineItems: {
    nodes: {
      id: string;
      title: string;
      variantTitle: string | null;
      sku: string | null;
      quantity: number;
      currentQuantity: number;
      originalUnitPriceSet: Money;
      discountedTotalSet: Money;
    }[];
  };
  fulfillments: {
    createdAt: string;
    status: string;
    trackingInfo: { company: string | null; number: string | null; url: string | null }[];
  }[];
  fulfillmentOrders: { nodes: { id: string; status: string; supportedActions: { action: string }[] }[] };
};

const fulfillableOrders = (o: Pick<OrderDetailNode, "fulfillmentOrders">) =>
  o.fulfillmentOrders.nodes.filter((f) => f.supportedActions.some((a) => a.action === "CREATE_FULFILLMENT"));

const PRODUCTS_QUERY = /* GraphQL */ `
  query Products($first: Int!, $after: String, $query: String) {
    products(first: $first, after: $after, query: $query, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        title
        status
        handle
        totalInventory
        tracksInventory
        variantsCount {
          count
        }
        featuredMedia {
          preview {
            image {
              url(transform: { maxWidth: 96, maxHeight: 96 })
            }
          }
        }
        priceRangeV2 {
          minVariantPrice { amount currencyCode }
          maxVariantPrice { amount currencyCode }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

type ProductNode = {
  id: string;
  title: string;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT" | "UNLISTED";
  handle: string;
  totalInventory: number | null;
  tracksInventory: boolean;
  variantsCount: { count: number } | null;
  featuredMedia: { preview: { image: { url: string } | null } | null } | null;
  priceRangeV2: { minVariantPrice: ShopifyMoney; maxVariantPrice: ShopifyMoney };
};

const PRODUCT_QUERY = /* GraphQL */ `
  query Product($id: ID!) {
    product(id: $id) {
      id
      title
      status
      handle
      variants(first: 100) {
        nodes {
          id
          title
          sku
          price
          compareAtPrice
          inventoryItem {
            id
            tracked
            inventoryLevels(first: 20) {
              nodes {
                location {
                  id
                  name
                }
                quantities(names: ["available"]) {
                  name
                  quantity
                }
              }
            }
          }
        }
      }
    }
  }
`;

type ProductDetailNode = {
  id: string;
  title: string;
  status: ProductNode["status"];
  handle: string;
  variants: {
    nodes: {
      id: string;
      title: string;
      sku: string | null;
      price: string;
      compareAtPrice: string | null;
      inventoryItem: {
        id: string;
        tracked: boolean;
        inventoryLevels: {
          nodes: { location: { id: string; name: string }; quantities: { name: string; quantity: number }[] }[];
        };
      } | null;
    }[];
  };
};

const gid = (kind: string) => z.string().min(1).max(200).regex(new RegExp(`^gid://shopify/${kind}/\\d+$`));

const rowOut = (o: OrderRowNode) => ({
  id: o.id,
  name: o.name,
  placedAt: o.createdAt,
  cancelledAt: o.cancelledAt,
  financialStatus: o.displayFinancialStatus,
  fulfillmentStatus: o.displayFulfillmentStatus,
  status: orderStatusGroup(o),
  itemCount: o.currentSubtotalLineItemsQuantity,
  items: o.lineItems.nodes.filter((i) => i.currentQuantity > 0).map((i) => ({ title: i.title, quantity: i.currentQuantity })),
  totalCents: cents(o.currentTotalPriceSet),
  currency: o.currentTotalPriceSet?.shopMoney.currencyCode ?? null,
});

export const shopifyRouter = createTRPCRouter({
  /** The connected shop (null = not connected). Tokens never leave the server. */
  get: appCmsProcedure.query(async ({ ctx }) => {
    const store = await shopifyStoreFor(ctx.projectId);
    return {
      configured: isShopifyConfigured(),
      store: store
        ? {
            shopDomain: store.shopDomain,
            name: store.name,
            currency: store.currency,
            timezone: store.timezone,
            planName: store.planName,
            needsReconnect: !store.accessTokenEnc,
            adminUrl: `https://admin.shopify.com/store/${store.shopDomain.replace(/\.myshopify\.com$/, "")}`,
            connectedAt: store.createdAt.toISOString(),
          }
        : null,
    };
  }),

  /** Shopify's consent screen on the owner's shop; the api callback finishes the connection. */
  connectUrl: appCmsFullAccessProcedure
    .input(z.object({ shop: z.string().trim().min(1).max(255) }))
    .mutation(async ({ ctx, input }) => {
      if (!isShopifyConfigured()) throw notConfigured();
      const shop = normalizeShop(input.shop);
      if (!shop) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Enter your store's myshopify.com address, like acme.myshopify.com." });
      }
      const taken = await db.query.hubShopifyStore.findFirst({ where: eq(hubShopifyStore.shopDomain, shop) });
      if (taken && taken.projectId !== ctx.projectId) {
        throw new TRPCError({ code: "CONFLICT", message: "That store is already connected to another project." });
      }
      const state = signShopifyState(
        { projectId: ctx.projectId, userId: ctx.user.id, shop },
        process.env.BETTER_AUTH_SECRET ?? ""
      );
      return { url: shopifyAuthorizeUrl(shop, state) };
    }),

  /** Revoke the app on the shop and forget it here. Products and orders on Shopify aren't touched. */
  disconnect: appCmsFullAccessProcedure.mutation(async ({ ctx }) => {
    await deleteShopifyRows([ctx.projectId]);
    return { ok: true };
  }),

  /**
   * Orders and sales since the shop's local midnight `days - 1` days ago,
   * cancelled orders left out, with a per-day series in the shop's timezone.
   * `capped` = more than SUMMARY_CAP orders, the totals cover the newest only.
   */
  summary: appCmsProcedure.input(z.object({ days: rangeDays })).query(async ({ ctx, input }) => {
    const store = await shopifyStoreFor(ctx.projectId);
    if (!store || !store.accessTokenEnc || !isShopifyConfigured()) return null;
    const start = localDayStart(store.timezone, input.days - 1);
    const query = `${orderSearch({ since: start })} -status:cancelled`;
    const byDate = new Map<string, { date: string; orders: number; salesCents: number }>();
    let orders = 0;
    let salesCents = 0;
    let currency: string | null = store.currency;
    let after: string | null = null;
    let capped = false;
    try {
      for (;;) {
        const page: { orders: { nodes: { createdAt: string; currentTotalPriceSet: Money }[]; pageInfo: PageInfo } } =
          await shopifyGql(store, SUMMARY_QUERY, { after, query });
        for (const o of page.orders.nodes) {
          const total = cents(o.currentTotalPriceSet) ?? 0;
          const date = localDateIn(store.timezone, new Date(o.createdAt));
          const hit = byDate.get(date) ?? { date, orders: 0, salesCents: 0 };
          hit.orders++;
          hit.salesCents += total;
          byDate.set(date, hit);
          orders++;
          salesCents += total;
          currency = o.currentTotalPriceSet?.shopMoney.currencyCode ?? currency;
        }
        if (!page.orders.pageInfo.hasNextPage) break;
        if (orders >= SUMMARY_CAP) {
          capped = true;
          break;
        }
        after = page.orders.pageInfo.endCursor;
      }
    } catch (error) {
      throw toTRPC(error, "Couldn't read your Shopify orders.");
    }
    return {
      orders,
      salesCents,
      avgOrderCents: orders > 0 ? Math.round(salesCents / orders) : null,
      estPayoutCents: null,
      commissionBps: null,
      currency,
      timezone: store.timezone,
      capped,
      from: localDateIn(store.timezone, start),
      to: localDateIn(store.timezone),
      byDay: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
    };
  }),

  /** Newest first, Shopify's own cursor. Filters compose with the cursor. */
  orders: appCmsProcedure
    .input(
      z.object({
        cursor: z.string().max(500).optional(),
        days: rangeDays.optional(),
        status: z.enum(["open", "completed", "canceled"]).optional(),
        search: z.string().trim().max(100).optional(),
        limit: z.union([z.literal(5), z.literal(50)]).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const store = await needStore(ctx.projectId);
      const since = input.days ? localDayStart(store.timezone, input.days - 1) : undefined;
      try {
        const data = await shopifyGql<{ orders: { nodes: OrderRowNode[]; pageInfo: PageInfo } }>(store, ORDERS_QUERY, {
          first: input.limit,
          after: input.cursor ?? null,
          query: orderSearch({ status: input.status, since, text: input.search }) || null,
        });
        return {
          items: data.orders.nodes.map(rowOut),
          nextCursor: data.orders.pageInfo.hasNextPage ? data.orders.pageInfo.endCursor : null,
        };
      } catch (error) {
        throw toTRPC(error, "Couldn't read your Shopify orders.");
      }
    }),

  /** One order, live: items, totals, shipments and what can still be done to it. */
  order: appCmsProcedure.input(z.object({ id: gid("Order") })).query(async ({ ctx, input }) => {
    const store = await needStore(ctx.projectId);
    let o: OrderDetailNode | null;
    try {
      o = (await shopifyGql<{ order: OrderDetailNode | null }>(store, ORDER_QUERY, { id: input.id })).order;
    } catch (error) {
      throw toTRPC(error, "Couldn't read that order.");
    }
    if (!o) throw new TRPCError({ code: "NOT_FOUND" });
    return {
      id: o.id,
      name: o.name,
      placedAt: o.createdAt,
      cancelledAt: o.cancelledAt,
      cancelReason: o.cancelReason,
      financialStatus: o.displayFinancialStatus,
      fulfillmentStatus: o.displayFulfillmentStatus,
      status: orderStatusGroup(o),
      tags: o.tags,
      shippingMethod: o.shippingLine?.title ?? null,
      currency: o.currentTotalPriceSet?.shopMoney.currencyCode ?? store.currency,
      lines: o.lineItems.nodes.map((l) => ({
        id: l.id,
        title: l.title,
        variantTitle: l.variantTitle,
        sku: l.sku,
        quantity: l.quantity,
        currentQuantity: l.currentQuantity,
        unitCents: cents(l.originalUnitPriceSet),
        totalCents: cents(l.discountedTotalSet),
      })),
      charges: {
        subtotalCents: cents(o.subtotalPriceSet),
        discountCents: cents(o.totalDiscountsSet),
        shippingCents: cents(o.totalShippingPriceSet),
        taxCents: cents(o.totalTaxSet),
        refundedCents: cents(o.totalRefundedSet),
        totalCents: cents(o.currentTotalPriceSet),
      },
      fulfillments: o.fulfillments.map((f) => ({
        createdAt: f.createdAt,
        status: f.status,
        tracking: f.trackingInfo,
      })),
      canFulfill: !o.cancelledAt && fulfillableOrders(o).length > 0,
      canCancel: !o.cancelledAt && o.displayFulfillmentStatus !== "FULFILLED",
      canRefund: o.refundable && !!o.currentTotalPriceSet && (cents(o.currentTotalPriceSet) ?? 0) > 0,
    };
  }),

  /** Mark every open fulfillment order shipped, with optional tracking. The customer isn't emailed. */
  fulfill: appCmsFullAccessProcedure
    .input(
      z.object({
        id: gid("Order"),
        tracking: z
          .object({
            number: z.string().trim().min(1).max(100),
            company: z.string().trim().max(100).optional(),
            url: z.string().trim().url().max(500).optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const store = await needStore(ctx.projectId);
      await writeLimit();
      try {
        const { order } = await shopifyGql<{ order: Pick<OrderDetailNode, "fulfillmentOrders"> | null }>(
          store,
          /* GraphQL */ `
            query FulfillmentOrders($id: ID!) {
              order(id: $id) {
                fulfillmentOrders(first: 20) {
                  nodes {
                    id
                    status
                    supportedActions {
                      action
                    }
                  }
                }
              }
            }
          `,
          { id: input.id }
        );
        if (!order) throw new TRPCError({ code: "NOT_FOUND" });
        const open = fulfillableOrders(order);
        if (!open.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Nothing left to ship on this order." });
        // One fulfillment per fulfillment order: each can sit at a different location.
        for (const fo of open) {
          const data = await shopifyGql<{ fulfillmentCreate: { userErrors: { message: string }[] } }>(
            store,
            /* GraphQL */ `
              mutation Fulfill($fulfillment: FulfillmentInput!) {
                fulfillmentCreate(fulfillment: $fulfillment) {
                  userErrors {
                    message
                  }
                }
              }
            `,
            {
              fulfillment: {
                lineItemsByFulfillmentOrder: [{ fulfillmentOrderId: fo.id }],
                notifyCustomer: false,
                ...(input.tracking ? { trackingInfo: input.tracking } : {}),
              },
            }
          );
          assertNoUserErrors(data.fulfillmentCreate.userErrors);
        }
      } catch (error) {
        throw toTRPC(error, "Shopify didn't take the fulfillment.");
      }
      return { ok: true };
    }),

  /** Cancel on Shopify (async there), optionally refunding to the original payment and restocking. No customer email. */
  cancel: appCmsFullAccessProcedure
    .input(
      z.object({
        id: gid("Order"),
        reason: z.enum(["CUSTOMER", "DECLINED", "FRAUD", "INVENTORY", "STAFF", "OTHER"]),
        refund: z.boolean(),
        restock: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const store = await needStore(ctx.projectId);
      await writeLimit();
      try {
        const data = await shopifyGql<{ orderCancel: { orderCancelUserErrors: { message: string }[] } }>(
          store,
          /* GraphQL */ `
            mutation Cancel(
              $orderId: ID!
              $reason: OrderCancelReason!
              $restock: Boolean!
              $refundMethod: OrderCancelRefundMethodInput
            ) {
              orderCancel(
                orderId: $orderId
                reason: $reason
                restock: $restock
                notifyCustomer: false
                refundMethod: $refundMethod
                staffNote: "Canceled from Client Hub"
              ) {
                orderCancelUserErrors {
                  message
                }
              }
            }
          `,
          {
            orderId: input.id,
            reason: input.reason,
            restock: input.restock,
            refundMethod: { originalPaymentMethodsRefund: input.refund },
          }
        );
        assertNoUserErrors(data.orderCancel.orderCancelUserErrors);
      } catch (error) {
        throw toTRPC(error, "Shopify didn't take the cancellation.");
      }
      return { ok: true };
    }),

  /** Full refund (items + shipping) to the original payment, as Shopify suggests it. No customer email. */
  refund: appCmsFullAccessProcedure.input(z.object({ id: gid("Order") })).mutation(async ({ ctx, input }) => {
    const store = await needStore(ctx.projectId);
    await writeLimit();
    try {
      const { order } = await shopifyGql<{
        order: {
          suggestedRefund: {
            refundLineItems: { lineItem: { id: string }; quantity: number }[];
            suggestedTransactions: {
              amountSet: { shopMoney: ShopifyMoney };
              gateway: string | null;
              kind: string;
              parentTransaction: { id: string } | null;
            }[];
          } | null;
        } | null;
      }>(
        store,
        /* GraphQL */ `
          query SuggestedRefund($id: ID!) {
            order(id: $id) {
              suggestedRefund(suggestFullRefund: true, refundShipping: true) {
                refundLineItems {
                  lineItem {
                    id
                  }
                  quantity
                }
                suggestedTransactions {
                  amountSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  gateway
                  kind
                  parentTransaction {
                    id
                  }
                }
              }
            }
          }
        `,
        { id: input.id }
      );
      const suggested = order?.suggestedRefund;
      if (!suggested || !suggested.suggestedTransactions.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nothing left to refund on this order." });
      }
      const data = await shopifyGql<{ refundCreate: { userErrors: { message: string }[] } }>(
        store,
        /* GraphQL */ `
          mutation Refund($input: RefundInput!, $key: String!) {
            refundCreate(input: $input) @idempotent(key: $key) {
              userErrors {
                message
              }
            }
          }
        `,
        {
          key: idempotencyKey(),
          input: {
            orderId: input.id,
            notify: false,
            note: "Refunded from Client Hub",
            shipping: { fullRefund: true },
            refundLineItems: suggested.refundLineItems.map((l) => ({ lineItemId: l.lineItem.id, quantity: l.quantity })),
            transactions: suggested.suggestedTransactions
              .filter((t) => t.parentTransaction)
              .map((t) => ({
                orderId: input.id,
                parentId: t.parentTransaction!.id,
                gateway: t.gateway,
                kind: "REFUND",
                amount: t.amountSet.shopMoney.amount,
              })),
          },
        }
      );
      assertNoUserErrors(data.refundCreate.userErrors);
    } catch (error) {
      throw toTRPC(error, "Shopify didn't take the refund.");
    }
    return { ok: true };
  }),

  /** Products, most recently updated first. */
  products: appCmsProcedure
    .input(z.object({ cursor: z.string().max(500).optional(), search: z.string().trim().max(100).optional() }))
    .query(async ({ ctx, input }) => {
      const store = await needStore(ctx.projectId);
      const q = input.search?.replace(/['"\\]/g, "");
      try {
        const data = await shopifyGql<{ products: { nodes: ProductNode[]; pageInfo: PageInfo } }>(store, PRODUCTS_QUERY, {
          first: 50,
          after: input.cursor ?? null,
          query: q ? `title:*${q}*` : null,
        });
        return {
          items: data.products.nodes.map((p) => ({
            id: p.id,
            title: p.title,
            status: p.status,
            handle: p.handle,
            image: p.featuredMedia?.preview?.image?.url ?? null,
            variantCount: p.variantsCount?.count ?? 0,
            totalInventory: p.tracksInventory ? p.totalInventory : null,
            minPriceCents: toCents(p.priceRangeV2.minVariantPrice),
            maxPriceCents: toCents(p.priceRangeV2.maxVariantPrice),
            currency: p.priceRangeV2.minVariantPrice.currencyCode,
          })),
          nextCursor: data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null,
        };
      } catch (error) {
        throw toTRPC(error, "Couldn't read your Shopify products.");
      }
    }),

  /** One product's variants with price and stock per location. */
  product: appCmsProcedure.input(z.object({ id: gid("Product") })).query(async ({ ctx, input }) => {
    const store = await needStore(ctx.projectId);
    let p: ProductDetailNode | null;
    try {
      p = (await shopifyGql<{ product: ProductDetailNode | null }>(store, PRODUCT_QUERY, { id: input.id })).product;
    } catch (error) {
      throw toTRPC(error, "Couldn't read that product.");
    }
    if (!p) throw new TRPCError({ code: "NOT_FOUND" });
    return {
      id: p.id,
      title: p.title,
      status: p.status,
      currency: store.currency,
      variants: p.variants.nodes.map((v) => ({
        id: v.id,
        title: v.title,
        sku: v.sku,
        priceCents: toCents({ amount: v.price }),
        compareAtPriceCents: v.compareAtPrice ? toCents({ amount: v.compareAtPrice }) : null,
        inventoryItemId: v.inventoryItem?.id ?? null,
        tracked: v.inventoryItem?.tracked ?? false,
        levels: (v.inventoryItem?.inventoryLevels.nodes ?? []).map((l) => ({
          locationId: l.location.id,
          locationName: l.location.name,
          available: l.quantities.find((q) => q.name === "available")?.quantity ?? 0,
        })),
      })),
    };
  }),

  /** Price / compare-at price of one variant. compareAtPriceCents null clears it. */
  updateVariant: appCmsFullAccessProcedure
    .input(
      z.object({
        productId: gid("Product"),
        variantId: gid("ProductVariant"),
        priceCents: z.number().int().min(0).max(100_000_000),
        compareAtPriceCents: z.number().int().min(0).max(100_000_000).nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const store = await needStore(ctx.projectId);
      await writeLimit();
      try {
        const data = await shopifyGql<{ productVariantsBulkUpdate: { userErrors: { message: string }[] } }>(
          store,
          /* GraphQL */ `
            mutation UpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
              productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                userErrors {
                  message
                }
              }
            }
          `,
          {
            productId: input.productId,
            variants: [
              {
                id: input.variantId,
                price: toAmount(input.priceCents),
                compareAtPrice: input.compareAtPriceCents == null ? null : toAmount(input.compareAtPriceCents),
              },
            ],
          }
        );
        assertNoUserErrors(data.productVariantsBulkUpdate.userErrors);
      } catch (error) {
        throw toTRPC(error, "Shopify didn't take the price change.");
      }
      return { ok: true };
    }),

  /** Set "available" stock of one item at one location. */
  setInventory: appCmsFullAccessProcedure
    .input(
      z.object({
        inventoryItemId: gid("InventoryItem"),
        locationId: gid("Location"),
        quantity: z.number().int().min(-1_000_000).max(1_000_000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const store = await needStore(ctx.projectId);
      await writeLimit();
      try {
        const key = idempotencyKey();
        const data = await shopifyGql<{ inventorySetQuantities: { userErrors: { message: string }[] } }>(
          store,
          /* GraphQL */ `
            mutation SetStock($input: InventorySetQuantitiesInput!, $key: String!) {
              inventorySetQuantities(input: $input) @idempotent(key: $key) {
                userErrors {
                  message
                }
              }
            }
          `,
          {
            key,
            input: {
              name: "available",
              reason: "correction",
              referenceDocumentUri: `logistics://client-hub/stock/${key}`,
              quantities: [
                {
                  inventoryItemId: input.inventoryItemId,
                  locationId: input.locationId,
                  quantity: input.quantity,
                  // Last write wins: the owner sets the number they counted.
                  changeFromQuantity: null,
                },
              ],
            },
          }
        );
        assertNoUserErrors(data.inventorySetQuantities.userErrors);
      } catch (error) {
        throw toTRPC(error, "Shopify didn't take the stock change.");
      }
      return { ok: true };
    }),
});

