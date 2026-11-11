// Thin REST wrapper over the Wix APIs this demo needs. Everything runs as an
// anonymous site visitor: the OAuth client ID mints a visitor token, which is
// enough to read the FAQ app and post into a Wix form. Endpoints:
//   POST /oauth2/token                              visitor token
//   POST /faq/v2/categories/query                   FAQ categories
//   POST /faq/v2/question-entries/query             FAQ questions (plain text)
//   GET  /form-schema-service/v4/forms/{id}         form fields
//   POST /form-submission-service/v4/submissions    create submission
// Add Bookings / Stores the same way: one function per endpoint, called from a page.

const API = "https://www.wixapis.com";
const CLIENT_ID = import.meta.env.WIX_CLIENT_ID as string | undefined;

export type FaqCategory = { id: string; title: string; questions: FaqQuestion[] };
export type FaqQuestion = { id: string; q: string; a: string; slug: string };
export type FormField = {
  target: string;
  label: string;
  required: boolean;
  kind: "text" | "email" | "phone" | "textarea" | "number" | "select";
  options?: string[];
  /** Half-width in the Wix layout (two per row). */
  half: boolean;
};

export class WixError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

let cached: { token: string; exp: number } | undefined;

async function token(): Promise<string> {
  if (!CLIENT_ID) throw new WixError("WIX_CLIENT_ID is not set", 500);
  if (cached && cached.exp > Date.now()) return cached.token;
  const res = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: CLIENT_ID, grantType: "anonymous" }),
  });
  if (!res.ok) throw new WixError(`token: ${res.status} ${await res.text()}`, res.status);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, exp: Date.now() + (data.expires_in - 60) * 1000 };
  return cached.token;
}

async function wix<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: await token(), ...init.headers },
  });
  if (!res.ok) throw new WixError(`${path}: ${res.status} ${await res.text()}`, res.status);
  return (await res.json()) as T;
}

// --- FAQ app ----------------------------------------------------------------

type RawCategory = { id: string; title: string; sortOrder?: number };
type RawQuestion = {
  id: string;
  question: string;
  plainText?: string;
  categoryId: string;
  sortOrder?: number;
  slug: string;
};

/** Categories with their questions, both in dashboard order. Empty categories dropped. */
export async function getFaq(): Promise<FaqCategory[]> {
  const [cats, qs] = await Promise.all([
    wix<{ categories: RawCategory[] }>("/faq/v2/categories/query", {
      method: "POST",
      body: JSON.stringify({ query: { sort: [{ fieldName: "sortOrder", order: "ASC" }] } }),
    }),
    wix<{ questionEntries: RawQuestion[] }>("/faq/v2/question-entries/query", {
      method: "POST",
      body: JSON.stringify({
        contentFormat: "PLAIN_TEXT",
        query: { sort: [{ fieldName: "sortOrder", order: "ASC" }], cursorPaging: { limit: 100 } },
      }),
    }),
  ]);
  const byCat = new Map<string, FaqQuestion[]>();
  for (const q of qs.questionEntries) {
    const list = byCat.get(q.categoryId) ?? [];
    list.push({ id: q.id, q: q.question, a: q.plainText ?? "", slug: q.slug });
    byCat.set(q.categoryId, list);
  }
  return cats.categories
    .map((c) => ({ id: c.id, title: c.title, questions: byCat.get(c.id) ?? [] }))
    .filter((c) => c.questions.length > 0);
}

// --- Wix Forms --------------------------------------------------------------

// Only the slice of the form schema we render. Real shape (checked against a
// Wix Forms "Website" form): fields carry `identifier` (CONTACTS_EMAIL,
// TEXT_AREA, SUBMIT_BUTTON...), `fieldType` INPUT | DISPLAY, and the storage
// key lives at `inputOptions.target`. Display order + width come from
// `steps[].layout.large.items` (row / column / width out of 12).
type RawField = {
  id: string;
  hidden?: boolean;
  identifier?: string;
  fieldType?: string;
  inputOptions?: {
    target?: string;
    required?: boolean;
    inputType?: string;
    stringOptions?: {
      componentType?: string;
      validation?: { format?: string };
      textInputOptions?: { label?: string };
      radioGroupOptions?: { label?: string; options?: { label?: string; value?: string }[] };
      dropdownOptions?: { label?: string; options?: { label?: string; value?: string }[] };
    };
    numberOptions?: { numberInputOptions?: { label?: string } };
    arrayOptions?: { checkboxGroupOptions?: { label?: string; options?: { label?: string; value?: string }[] } };
  };
};
type RawLayoutItem = { fieldId: string; row?: number; column?: number; width?: number };
type RawForm = {
  id: string;
  formFields?: RawField[];
  steps?: { layout?: { large?: { items?: RawLayoutItem[] } } }[];
  properties?: { name?: string };
};

function fieldLabel(f: RawField): string {
  const s = f.inputOptions?.stringOptions;
  return (
    s?.textInputOptions?.label ??
    s?.radioGroupOptions?.label ??
    s?.dropdownOptions?.label ??
    f.inputOptions?.numberOptions?.numberInputOptions?.label ??
    f.inputOptions?.arrayOptions?.checkboxGroupOptions?.label ??
    f.inputOptions?.target ??
    f.id
  );
}

function fieldKind(f: RawField): { kind: FormField["kind"]; options?: string[] } {
  const s = f.inputOptions?.stringOptions;
  const opts = s?.dropdownOptions?.options ?? s?.radioGroupOptions?.options;
  if (opts?.length) return { kind: "select", options: opts.map((o) => o.value ?? o.label ?? "") };
  if (f.inputOptions?.inputType === "NUMBER") return { kind: "number" };
  const hint = `${f.identifier ?? ""} ${s?.validation?.format ?? ""} ${s?.componentType ?? ""}`.toUpperCase();
  if (hint.includes("EMAIL")) return { kind: "email" };
  if (hint.includes("PHONE")) return { kind: "phone" };
  if (hint.includes("TEXT_AREA")) return { kind: "textarea" };
  return { kind: "text" };
}

/** Fields of a Wix form in display order (row, then column), ready to render. */
export async function getForm(formId: string): Promise<{ name: string; fields: FormField[] }> {
  const { form } = await wix<{ form: RawForm }>(`/form-schema-service/v4/forms/${formId}`);
  const layout = new Map<string, RawLayoutItem>();
  for (const step of form.steps ?? [])
    for (const item of step.layout?.large?.items ?? []) layout.set(item.fieldId, item);
  const pos = (f: RawField) => {
    const l = layout.get(f.id);
    return l ? (l.row ?? 0) * 100 + (l.column ?? 0) : Number.MAX_SAFE_INTEGER;
  };
  return {
    name: form.properties?.name ?? "Contact",
    fields: (form.formFields ?? [])
      .filter((f) => f.fieldType === "INPUT" && f.inputOptions?.target && !f.hidden)
      .sort((a, b) => pos(a) - pos(b))
      .map((f) => ({
        target: f.inputOptions?.target as string,
        label: fieldLabel(f),
        required: f.inputOptions?.required ?? false,
        half: (layout.get(f.id)?.width ?? 12) <= 6,
        ...fieldKind(f),
      })),
  };
}

/** Creates a submission. `values` keys must be field targets of the form. */
export async function submitForm(formId: string, values: Record<string, string | number>) {
  return wix<{ submission: { id: string; status: string } }>("/form-submission-service/v4/submissions", {
    method: "POST",
    body: JSON.stringify({ submission: { formId, submissions: values } }),
  });
}

// --- Wix Blog ---------------------------------------------------------------
//   GET /blog/v3/posts?fieldsets=...          published posts, newest first
//   GET /blog/v3/posts/slugs/{slug}           one post by slug
// Only published posts are visible to a visitor token; drafts need the owner.

export type RichNode = {
  type: string;
  id?: string;
  nodes?: RichNode[];
  textData?: { text: string; decorations?: { type: string; linkData?: { link?: { url?: string; target?: string } } }[] };
  headingData?: { level?: number };
  imageData?: { image?: { src?: { id?: string; url?: string }; width?: number; height?: number }; altText?: string; caption?: string };
  listData?: unknown;
  codeBlockData?: unknown;
  dividerData?: unknown;
};
export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  firstPublishedDate: string;
  minutesToRead?: number;
  coverUrl?: string;
  richContent?: { nodes: RichNode[] };
};
type RawPost = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  firstPublishedDate: string;
  minutesToRead?: number;
  coverMedia?: { image?: { url?: string; id?: string }; enabled?: boolean };
  richContent?: { nodes: RichNode[] };
  media?: { wixMedia?: { image?: { url?: string; id?: string } }; displayed?: boolean };
};

/** Wix media ids look like `wix:image://v1/<file>/<name>#...`; turn them into a static URL. */
export function wixImageUrl(idOrUrl?: string): string | undefined {
  if (!idOrUrl) return undefined;
  if (idOrUrl.startsWith("http")) return idOrUrl;
  const m = idOrUrl.match(/^wix:image:\/\/v1\/([^/#]+)/);
  return m ? `https://static.wixstatic.com/media/${m[1]}` : undefined;
}

function toPost(p: RawPost): BlogPost {
  const img = p.coverMedia?.image ?? p.media?.wixMedia?.image;
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt ?? "",
    firstPublishedDate: p.firstPublishedDate,
    minutesToRead: p.minutesToRead,
    coverUrl: wixImageUrl(img?.url ?? img?.id),
    richContent: p.richContent,
  };
}

export async function getPosts(limit = 20): Promise<BlogPost[]> {
  const { posts } = await wix<{ posts: RawPost[] }>(`/blog/v3/posts?paging.limit=${limit}&sort=PUBLISHED_DATE_DESC`);
  return posts.map(toPost);
}

export async function getPost(slug: string): Promise<BlogPost | undefined> {
  try {
    const { post } = await wix<{ post: RawPost }>(`/blog/v3/posts/slugs/${encodeURIComponent(slug)}?fieldsets=RICH_CONTENT`);
    return toPost(post);
  } catch (e) {
    if (e instanceof WixError && e.status === 404) return undefined;
    throw e;
  }
}

// --- Wix Stores + eCommerce --------------------------------------------------
//   POST /stores/v3/products/query                     catalog (no variants)
//   GET  /stores/v3/products/slug/{slug}?fields=...     one product + variants
//   GET  /ecom/v1/carts/current                         visitor's cart (404 = none)
//   POST /ecom/v1/carts/current/add-to-cart             { catalogReference: { appId, catalogItemId, options: { variantId } } }
//   POST /ecom/v1/carts/current/update-line-items-quantity
//   POST /ecom/v1/carts/current/remove-line-items
//   POST /ecom/v1/carts/current/create-checkout         → checkoutId
//   POST /_api/redirects-api/v1/redirect-session        → Wix-hosted checkout URL
// Carts belong to a visitor identity, so cart calls use a per-visitor token
// kept in an httpOnly cookie (see visitorToken), never the shared read token.

import type { AstroCookies } from "astro";

export const STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";
const SESSION_COOKIE = "wix_session";

export type ProductChoice = { name: string; colorCode?: string; inStock: boolean };
export type ProductOption = { name: string; render: "TEXT_CHOICES" | "SWATCH_CHOICES"; choices: ProductChoice[] };
export type Variant = { id: string; choices: Record<string, string>; price: string; compareAt?: string; inStock: boolean };
export type Product = {
  id: string;
  name: string;
  slug: string;
  priceFrom: string;
  priceTo: string;
  currency: string;
  image?: string;
  images: string[];
  descriptionHtml: string;
  ribbon?: string;
  inStock: boolean;
  options: ProductOption[];
  variants: Variant[];
};
export type CartLine = {
  id: string;
  name: string;
  quantity: number;
  price: string;
  lineTotal: string;
  details: string[];
  image?: string;
  slug?: string;
};
export type Cart = { id: string; lines: CartLine[]; subtotal: string; count: number };

type RawProduct = {
  id: string;
  name: string;
  slug: string;
  currency?: string;
  ribbon?: { name?: string };
  visible?: boolean;
  actualPriceRange?: { minValue?: { amount?: string }; maxValue?: { amount?: string } };
  media?: { main?: { image?: { url?: string } }; itemsInfo?: { items?: { image?: { url?: string } }[] } };
  plainDescription?: string;
  inventory?: { availabilityStatus?: string };
  options?: { name: string; optionRenderType?: string; choicesSettings?: { choices?: { name: string; colorCode?: string; inStock?: boolean; visible?: boolean }[] } }[];
  variantsInfo?: {
    variants?: {
      id: string;
      visible?: boolean;
      choices?: { optionChoiceNames?: { optionName?: string; choiceName?: string } }[];
      price?: { actualPrice?: { amount?: string }; compareAtPrice?: { amount?: string } };
      inventoryStatus?: { inStock?: boolean };
    }[];
  };
};

/** Resized wixstatic image (fill crop). Pass the raw static.wixstatic.com URL. */
export function wixImage(url: string | undefined, w: number, h: number): string | undefined {
  if (!url) return undefined;
  const m = url.match(/^https:\/\/static\.wixstatic\.com\/media\/([^/]+)$/);
  return m ? `https://static.wixstatic.com/media/${m[1]}/v1/fill/w_${w},h_${h},al_c,q_85/${m[1]}` : url;
}

function toProduct(p: RawProduct): Product {
  const variants = (p.variantsInfo?.variants ?? [])
    .filter((v) => v.visible !== false)
    .map((v) => ({
      id: v.id,
      choices: Object.fromEntries((v.choices ?? []).map((c) => [c.optionChoiceNames?.optionName ?? "", c.optionChoiceNames?.choiceName ?? ""])),
      price: v.price?.actualPrice?.amount ?? "0",
      compareAt: v.price?.compareAtPrice?.amount,
      inStock: v.inventoryStatus?.inStock ?? true,
    }));
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    priceFrom: p.actualPriceRange?.minValue?.amount ?? "0",
    priceTo: p.actualPriceRange?.maxValue?.amount ?? "0",
    currency: p.currency ?? "USD",
    image: p.media?.main?.image?.url,
    images: (p.media?.itemsInfo?.items ?? []).map((i) => i.image?.url).filter((u): u is string => !!u),
    descriptionHtml: p.plainDescription ?? "",
    ribbon: p.ribbon?.name,
    inStock: p.inventory?.availabilityStatus !== "OUT_OF_STOCK",
    options: (p.options ?? []).map((o) => ({
      name: o.name,
      render: o.optionRenderType === "SWATCH_CHOICES" ? "SWATCH_CHOICES" : "TEXT_CHOICES",
      choices: (o.choicesSettings?.choices ?? []).filter((c) => c.visible !== false).map((c) => ({ name: c.name, colorCode: c.colorCode, inStock: c.inStock ?? true })),
    })),
    variants,
  };
}

export async function getProducts(): Promise<Product[]> {
  const { products } = await wix<{ products: RawProduct[] }>("/stores/v3/products/query", {
    method: "POST",
    body: JSON.stringify({ query: { filter: { visible: true }, cursorPaging: { limit: 48 } }, fields: ["CURRENCY"] }),
  });
  return products.map(toProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  try {
    const { product } = await wix<{ product: RawProduct }>(
      `/stores/v3/products/slug/${encodeURIComponent(slug)}?fields=VARIANT_OPTION_CHOICE_NAMES&fields=PLAIN_DESCRIPTION&fields=MEDIA_ITEMS_INFO&fields=CURRENCY`,
    );
    return toProduct(product);
  } catch (e) {
    if (e instanceof WixError && e.status === 404) return undefined;
    throw e;
  }
}

// Per-visitor identity. Wix returns a refresh token with every visitor token;
// we keep { access, refresh, exp } in an httpOnly cookie so the same visitor
// gets the same cart across requests and across the Netlify functions.
type Session = { at: string; rt: string; exp: number };

async function grant(body: Record<string, string>): Promise<Session> {
  const res = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: CLIENT_ID, ...body }),
  });
  if (!res.ok) throw new WixError(`visitor token: ${res.status} ${await res.text()}`, res.status);
  const d = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };
  return { at: d.access_token, rt: d.refresh_token, exp: Date.now() + (d.expires_in - 120) * 1000 };
}

/** Access token for this browser's visitor; creates the identity on first use when `create` is true. */
export async function visitorToken(cookies: AstroCookies, create = true): Promise<string | undefined> {
  let s: Session | undefined;
  try {
    s = cookies.get(SESSION_COOKIE)?.json() as Session | undefined;
  } catch {
    s = undefined;
  }
  if (s && s.exp > Date.now()) return s.at;
  if (!s && !create) return undefined;
  try {
    s = s ? await grant({ grantType: "refresh_token", refreshToken: s.rt }) : await grant({ grantType: "anonymous" });
  } catch {
    if (!create) return undefined;
    s = await grant({ grantType: "anonymous" });
  }
  cookies.set(SESSION_COOKIE, JSON.stringify(s), { path: "/", httpOnly: true, sameSite: "lax", secure: import.meta.env.PROD, maxAge: 60 * 60 * 24 * 30 });
  return s.at;
}

type RawCart = {
  id: string;
  lineItems?: {
    id: string;
    quantity: number;
    productName?: { original?: string };
    price?: { amount?: string; formattedAmount?: string };
    lineItemPrice?: { formattedAmount?: string };
    descriptionLines?: { plainText?: { original?: string }; colorInfo?: { original?: string } }[];
    image?: { url?: string };
    url?: { relativePath?: string; url?: string };
  }[];
  subtotal?: { formattedAmount?: string };
};

function toCart(c: RawCart): Cart {
  const lines = (c.lineItems ?? []).map((l) => ({
    id: l.id,
    name: l.productName?.original ?? "",
    quantity: l.quantity,
    price: l.price?.formattedAmount ?? "",
    lineTotal: l.lineItemPrice?.formattedAmount ?? "",
    details: (l.descriptionLines ?? []).map((d) => d.plainText?.original ?? d.colorInfo?.original ?? "").filter(Boolean),
    image: l.image?.url,
    slug: l.url?.relativePath?.split("/").pop(),
  }));
  return { id: c.id, lines, subtotal: c.subtotal?.formattedAmount ?? "", count: lines.reduce((n, l) => n + l.quantity, 0) };
}

function cartCall(token: string, path: string, body?: unknown): Promise<Cart> {
  return fetch(`${API}/ecom/v1/carts/current${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then(async (res) => {
    if (!res.ok) throw new WixError(`cart${path}: ${res.status} ${await res.text()}`, res.status);
    const d = (await res.json()) as { cart: RawCart };
    return toCart(d.cart);
  });
}

export async function getCart(token: string): Promise<Cart | undefined> {
  try {
    return await cartCall(token, "");
  } catch (e) {
    if (e instanceof WixError && e.status === 404) return undefined;
    throw e;
  }
}

export function addToCart(token: string, productId: string, variantId: string, quantity = 1) {
  return cartCall(token, "/add-to-cart", {
    lineItems: [{ quantity, catalogReference: { appId: STORES_APP_ID, catalogItemId: productId, options: { variantId } } }],
  });
}

export function updateLineQuantity(token: string, lineId: string, quantity: number) {
  return cartCall(token, "/update-line-items-quantity", { lineItems: [{ id: lineId, quantity }] });
}

export function removeLine(token: string, lineId: string) {
  return cartCall(token, "/remove-line-items", { lineItemIds: [lineId] });
}

/** Turns the current cart into a checkout and returns the Wix-hosted checkout URL. */
export async function checkoutUrl(token: string, origin: string): Promise<string> {
  const headers = { "Content-Type": "application/json", Authorization: token };
  const co = await fetch(`${API}/ecom/v1/carts/current/create-checkout`, { method: "POST", headers, body: JSON.stringify({ channelType: "WEB" }) });
  if (!co.ok) throw new WixError(`create-checkout: ${co.status} ${await co.text()}`, co.status);
  const { checkoutId } = (await co.json()) as { checkoutId: string };
  const rs = await fetch(`${API}/_api/redirects-api/v1/redirect-session`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ecomCheckout: { checkoutId },
      callbacks: { postFlowUrl: `${origin}/shop`, thankYouPageUrl: `${origin}/shop/thank-you`, cartPageUrl: `${origin}/cart` },
    }),
  });
  if (!rs.ok) throw new WixError(`redirect-session: ${rs.status} ${await rs.text()}`, rs.status);
  const { redirectSession } = (await rs.json()) as { redirectSession: { fullUrl: string } };
  return redirectSession.fullUrl;
}

// --- Wix CMS (Data) ---------------------------------------------------------
//   POST /wix-data/v2/items/query  { dataCollectionId, query: { sort } }
// Collection id = the lowercase id shown in the CMS (e.g. "services"). The
// collection must allow "Anyone" to view, or the visitor token gets 403.

/** Items of a CMS collection sorted by `order`, as plain data objects. */
export async function getCollection<T extends Record<string, unknown>>(collectionId: string, sortField = "order"): Promise<T[]> {
  const { dataItems } = await wix<{ dataItems: { id: string; data: T }[] }>("/wix-data/v2/items/query", {
    method: "POST",
    body: JSON.stringify({ dataCollectionId: collectionId, query: { sort: [{ fieldName: sortField, order: "ASC" }], paging: { limit: 100 } } }),
  });
  return dataItems.map((i) => i.data);
}
