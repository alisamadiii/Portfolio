import "server-only";

import { TRPCError } from "@trpc/server";

import { RICOS_MARKDOWN_PLUGINS } from "./wix-shared";

// ─── Wix API (client's site, via the hub's Wix app) ──────────────
// Raw REST, no SDK. The hub's Wix app is installed on the client's site; the
// app instance id (hub_project.wixInstanceId) plus the app secret mint
// client-credentials tokens. No user tokens, nothing to refresh.

const BASE = "https://www.wixapis.com";

export const isWixConfigured = () =>
  !!(process.env.WIX_APP_ID && process.env.WIX_APP_SECRET && process.env.WIX_SHARE_URL_ID);

// Tokens live 4 hours. One per site instance, refreshes shared.
const cache = new Map<string, { token: string; exp: number }>();
const inflight = new Map<string, Promise<string>>();

const reconnect = () =>
  new TRPCError({
    code: "PRECONDITION_FAILED",
    message: "Wix needs to be reconnected. The app may have been removed from the site.",
  });

async function fetchToken(instanceId: string): Promise<string> {
  const res = await fetch(`${BASE}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.WIX_APP_ID ?? "",
      client_secret: process.env.WIX_APP_SECRET ?? "",
      instance_id: instanceId,
    }),
  });
  if (!res.ok) throw reconnect();
  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw reconnect();
  cache.set(instanceId, {
    token: body.access_token,
    exp: Date.now() + (body.expires_in ?? 4 * 3600) * 1000,
  });
  return body.access_token;
}

export async function wixTokenFor(instanceId: string): Promise<string> {
  const hit = cache.get(instanceId);
  if (hit && hit.exp - 5 * 60_000 > Date.now()) return hit.token;
  const pending = inflight.get(instanceId);
  if (pending) return pending;
  const next = fetchToken(instanceId).finally(() => inflight.delete(instanceId));
  inflight.set(instanceId, next);
  return next;
}

export const forgetWixToken = (instanceId: string) => cache.delete(instanceId);

async function wix<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: token,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 401) throw reconnect();
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new TRPCError({
      code:
        res.status === 403
          ? "FORBIDDEN"
          : res.status === 404
            ? "NOT_FOUND"
            : "INTERNAL_SERVER_ERROR",
      message:
        res.status === 403
          ? "The Wix app doesn't have permission for this. Reconnect Wix to grant it."
          : `Wix: ${body?.message ?? res.status}`,
    });
  }
  return (await res.json().catch(() => ({}))) as T;
}

const post = <T>(token: string, path: string, body: unknown) =>
  wix<T>(token, path, { method: "POST", body: JSON.stringify(body) });

// ─── Site ────────────────────────────────────────────────────────

type WixAddress = {
  formatted?: string;
  street?: string;
  streetNumber?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
};

export type WixSiteProperties = {
  siteDisplayName?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  address?: WixAddress;
  timeZone?: string;
  description?: string;
};

export const getWixSiteProperties = async (token: string) =>
  (await wix<{ properties?: WixSiteProperties }>(token, "/site-properties/v4/properties"))
    .properties ?? {};

export const listWixSiteUrls = async (token: string) =>
  (
    await wix<{ urls?: { url: string; primary?: boolean }[] }>(
      token,
      "/urls-server/v2/published-site-urls"
    )
  ).urls ?? [];

export const formatWixAddress = (a: WixAddress | undefined) => {
  if (!a) return null;
  if (a.formatted) return a.formatted;
  const line = [a.streetNumber, a.street].filter(Boolean).join(" ");
  return [line, a.city, a.state, a.zip, a.country].filter(Boolean).join(", ") || null;
};

export const listWixInstalledApps = async (token: string) =>
  (
    await wix<{ appInstances?: { id: string; appDefId: string; enabled?: boolean }[] }>(
      token,
      "/apps-installer-service/v1/app-instances"
    )
  ).appInstances ?? [];

// ─── Blog ────────────────────────────────────────────────────────

export type WixPost = {
  id: string;
  title: string;
  excerpt?: string;
  memberId?: string;
  status?: string;
  firstPublishedDate?: string;
  lastPublishedDate?: string;
  editedDate?: string;
  hasUnpublishedChanges?: boolean;
  url?: { base?: string; path?: string };
  metrics?: { views?: number };
  richContent?: { nodes?: unknown[] };
};

export const listWixLivePosts = async (token: string) =>
  (
    await post<{ posts?: WixPost[] }>(token, "/blog/v3/posts/query", {
      query: {
        sort: [{ fieldName: "lastPublishedDate", order: "DESC" }],
        paging: { limit: 100 },
      },
      fieldsets: ["URL", "METRICS"],
    })
  ).posts ?? [];

export const listWixDraftPosts = async (token: string) =>
  (
    await post<{ draftPosts?: WixPost[] }>(token, "/blog/v3/draft-posts/query", {
      query: { paging: { limit: 100 } },
    })
  ).draftPosts ?? [];

export const getWixDraftPost = async (token: string, id: string) =>
  (
    await wix<{ draftPost: WixPost }>(
      token,
      `/blog/v3/draft-posts/${encodeURIComponent(id)}?fieldsets=RICH_CONTENT`
    )
  ).draftPost;

/** Any site member can own a post written by the app: use the first one. */
export const firstWixMemberId = async (token: string) =>
  (
    await wix<{ members?: { id: string }[] }>(token, "/members/v1/members?paging.limit=1")
  ).members?.[0]?.id ?? null;

export const createWixDraftPost = async (
  token: string,
  draftPost: Record<string, unknown>,
  publish: boolean
) =>
  (
    await post<{ draftPost: WixPost }>(token, "/blog/v3/draft-posts", { draftPost, publish })
  ).draftPost;

export const updateWixDraftPost = (
  token: string,
  draftPost: Record<string, unknown> & { id: string },
  action?: "UPDATE_PUBLISH" | "UPDATE_REVERT_TO_DRAFT"
) =>
  wix<{ draftPost: WixPost }>(token, `/blog/v3/draft-posts/${encodeURIComponent(draftPost.id)}`, {
    method: "PATCH",
    body: JSON.stringify({ draftPost, ...(action ? { action } : {}) }),
  });

export const publishWixDraftPost = (token: string, id: string) =>
  post(token, `/blog/v3/draft-posts/${encodeURIComponent(id)}/publish`, {});

export const deleteWixDraftPost = (token: string, id: string) =>
  wix(token, `/blog/v3/draft-posts/${encodeURIComponent(id)}`, { method: "DELETE" });

export const ricosToMarkdown = async (token: string, nodes: unknown[]) =>
  (
    await post<{ markdown?: string }>(token, "/ricos/v1/ricos-document/convert/from-ricos", {
      document: { nodes },
      targetFormat: "MARKDOWN",
    })
  ).markdown ?? "";

export const markdownToRicos = async (token: string, markdown: string) =>
  (
    await post<{ document?: { nodes?: unknown[] } }>(
      token,
      "/ricos/v1/ricos-document/convert/to-ricos",
      { markdown, options: { plugins: RICOS_MARKDOWN_PLUGINS } }
    )
  ).document ?? { nodes: [] };

// ─── Forms ───────────────────────────────────────────────────────

export type WixSubmission = {
  id: string;
  formId: string;
  status?: string;
  createdDate?: string;
  submissions?: Record<string, unknown>;
};

const FORMS_NS = "wix.form_app.form";

export const listWixForms = async (token: string) =>
  (
    await wix<{ forms?: { id: string; name?: string }[] }>(
      token,
      `/form-schema-service/v4/forms?namespace=${FORMS_NS}&fieldsets=METADATA&paging.limit=100`
    )
  ).forms ?? [];

export const listWixSubmissions = async (token: string) =>
  (
    await post<{ submissions?: WixSubmission[] }>(
      token,
      "/form-submission-service/v4/submissions/namespace/query",
      {
        query: {
          filter: { namespace: FORMS_NS },
          sort: [{ fieldName: "createdDate", order: "DESC" }],
          cursorPaging: { limit: 100 },
        },
      }
    )
  ).submissions ?? [];

// ─── Contacts, orders, bookings (read-only) ──────────────────────

export type WixContact = {
  id: string;
  createdDate?: string;
  info?: { name?: { first?: string; last?: string } };
  primaryInfo?: { email?: string; phone?: string };
};

export const listWixContacts = async (token: string, offset: number) => {
  const res = await post<{ contacts?: WixContact[]; pagingMetadata?: { total?: number } }>(
    token,
    "/contacts/v4/contacts/query",
    {
      query: {
        sort: [{ fieldName: "createdDate", order: "DESC" }],
        paging: { limit: 50, offset },
      },
    }
  );
  return { contacts: res.contacts ?? [], total: res.pagingMetadata?.total ?? null };
};

export type WixOrder = {
  id: string;
  number?: string;
  createdDate?: string;
  status?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  buyerInfo?: { email?: string };
  billingInfo?: { contactDetails?: { firstName?: string; lastName?: string } };
  priceSummary?: { total?: { formattedAmount?: string; amount?: string } };
  currency?: string;
};

export const listWixOrders = async (token: string) =>
  (
    await post<{ orders?: WixOrder[] }>(token, "/ecom/v1/orders/search", {
      search: {
        sort: [{ fieldName: "createdDate", order: "DESC" }],
        cursorPaging: { limit: 50 },
      },
    })
  ).orders ?? [];

export type WixBooking = {
  booking?: {
    id: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    bookedEntity?: { title?: string };
    contactDetails?: { firstName?: string; lastName?: string; email?: string; phone?: string };
  };
};

export const listWixBookings = async (token: string) =>
  (
    await post<{ extendedBookings?: WixBooking[] }>(
      token,
      "/bookings/bookings-reader/v2/extended-bookings/query",
      {
        query: {
          filter: { "booking.startDate": { $gte: new Date().toISOString() } },
          sort: [{ fieldName: "booking.startDate", order: "ASC" }],
          cursorPaging: { limit: 50 },
        },
      }
    )
  ).extendedBookings ?? [];
