import { AwsClient } from "aws4fetch";

// /showcase data: pre-built client sites from the client-websites R2 bucket
// (contract in apps/client-websites/README.md). Every folder is listed; the
// video and poster are optional. The site's HTML is never read or served here,
// only preview.mp4, preview.jpg, presentation.html (speaker notes stripped)
// and a whitelisted subset of _meta.json.

export const SLUG = /^[a-z0-9][a-z0-9-]*$/;
export const MEDIA_FILES = {
  "preview.mp4": "video/mp4",
  "preview.jpg": "image/jpeg",
} as const;
export type MediaFile = keyof typeof MEDIA_FILES;

export type ShowcaseProject = {
  slug: string;
  name: string;
  category: string | null;
  // the /showcase filter tab, grouped from the category
  industry: Industry;
  address: string | null;
  // Google Maps link for the business (the stored mapsUrl, else a search)
  mapsUrl: string | null;
  city: string | null;
  rating: number | null;
  reviewCount: number | null;
  hours: string[];
  title: string | null;
  summary: string | null;
  features: string[];
  hasVideo: boolean;
  hasPoster: boolean;
  hasPresentation: boolean;
  uploadedAt: string | null;
  // earliest LastModified of the folder's objects in R2
  createdAt: string | null;
};

// Showcase filter tabs, in display order. A project's industry is the first
// whose pattern matches its business.category ("Used car dealer & auto
// repair" -> automotive), or showcase.industry in _meta.json when set to one
// of these ids. Anything unmatched lands in "other".
export const INDUSTRIES = [
  { id: "restaurants", label: "Restaurants", match: /restaurant|cafe|coffee|bakery|grill|pizza|bar\b|diner|food|catering/i },
  { id: "automotive", label: "Automotive", match: /auto|car\b|car |dealer|tire|mechanic|body shop|towing|detailing/i },
  { id: "beauty", label: "Beauty & barber", match: /barber|salon|beauty|nail|spa\b|lash|brow|tattoo/i },
  { id: "home-services", label: "Home services", match: /plumb|hvac|roof|electric|handyman|landscap|lawn|pest|clean|paint|contractor|pool/i },
  { id: "health", label: "Health", match: /dent|clinic|doctor|chiropract|therap|medical|pharmacy|fitness|gym|yoga/i },
  { id: "other", label: "Other", match: null },
] as const;
export type Industry = (typeof INDUSTRIES)[number]["id"];

const industryOf = (override: string | null, category: string | null): Industry =>
  INDUSTRIES.find((i) => i.id === override)?.id ??
  INDUSTRIES.find((i) => i.match && category && i.match.test(category))?.id ??
  "other";

const env = (name: string): string | undefined =>
  process.env[name] ?? import.meta.env[name];

let cachedClient: { client: AwsClient; base: string } | null | undefined;

const r2 = () => {
  if (cachedClient === undefined) {
    const endpoint = env("SHOWCASE_R2_ENDPOINT");
    const accessKeyId = env("SHOWCASE_R2_ACCESS_KEY_ID");
    const secretAccessKey = env("SHOWCASE_R2_SECRET_ACCESS_KEY");
    const bucket = env("SHOWCASE_R2_BUCKET");
    cachedClient =
      endpoint && accessKeyId && secretAccessKey && bucket
        ? {
            client: new AwsClient({
              accessKeyId,
              secretAccessKey,
              service: "s3",
              region: "auto",
            }),
            base: `${endpoint.replace(/\/+$/, "")}/${bucket}`,
          }
        : null;
  }
  return cachedClient;
};

const unescapeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

// Stale-while-revalidate: after TTL the old value is still returned at once
// and a refresh runs in the background, so no visitor ever waits on R2 once
// the server is warm. A failed load is not kept: the next call tries again.
const TTL = 5 * 60 * 1000;
type Cached<T> = { get: () => Promise<T> };

const cached = <T>(loader: () => Promise<T>): Cached<T> => {
  let value: { at: number; data: T } | null = null;
  let pending: Promise<T> | null = null;
  const refresh = () => {
    pending ??= loader()
      .then((data) => {
        value = { at: Date.now(), data };
        return data;
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  };
  return {
    get: () => {
      if (!value) return refresh();
      if (Date.now() - value.at > TTL) refresh().catch(() => {});
      return Promise.resolve(value.data);
    },
  };
};

// Every top-level folder with its creation time (earliest object
// LastModified), plus which of the showcase files each one has, from one
// paginated listing of the whole bucket (small: one folder per client).
const listBucket = async () => {
  const conn = r2();
  if (!conn) return { slugs: new Map<string, string>(), keys: new Set<string>() };
  const slugs = new Map<string, string>();
  const keys = new Set<string>();
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ "list-type": "2" });
    if (cursor) query.set("continuation-token", cursor);
    const res = await conn.client.fetch(`${conn.base}?${query.toString()}`);
    if (!res.ok) throw new Error(`Showcase list failed (${res.status})`);
    const xml = await res.text();
    for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const key = unescapeXml(m[1]!.match(/<Key>(.*?)<\/Key>/)?.[1] ?? "");
      const slug = key.slice(0, key.indexOf("/"));
      if (!SLUG.test(slug)) continue;
      const modified = m[1]!.match(/<LastModified>(.*?)<\/LastModified>/)?.[1] ?? "";
      const seen = slugs.get(slug);
      if (seen === undefined || (modified && (!seen || modified < seen))) {
        slugs.set(slug, modified);
      }
      if (/^[^/]+\/(_meta\.json|preview\.mp4|preview\.jpg|presentation\.html)$/.test(key)) {
        keys.add(key);
      }
    }
    cursor = /<IsTruncated>true<\/IsTruncated>/.test(xml)
      ? unescapeXml(
          xml.match(
            /<NextContinuationToken>(.*?)<\/NextContinuationToken>/
          )?.[1] ?? ""
        ) || null
      : null;
  } while (cursor);
  return { slugs, keys };
};

// Streams one whitelisted media file. Range and conditional headers are
// forwarded so Safari can seek and browsers can revalidate.
export const getMedia = (
  slug: string,
  file: MediaFile,
  headers: Record<string, string>
) => {
  const conn = r2();
  if (!conn || !SLUG.test(slug)) return null;
  return conn.client.fetch(
    `${conn.base}/${encodeURIComponent(slug)}/${file}`,
    { headers }
  );
};

// The walkthrough deck as public HTML. Speaker notes are Ali's sales notes,
// so <aside> notes are removed and the notes UI hidden. Decks that keep notes
// anywhere else (a .notes element, a notes array in the script) can't be
// cleaned reliably and are not published: null, so no button shows.
const LEFTOVER_NOTES = [/class=["'][^"']*\bnotes\b/i, /\bN\s*=\s*\[/];

const loadPresentation = async (slug: string) => {
  const conn = r2();
  if (!conn) return null;
  const res = await conn.client.fetch(`${conn.base}/${slug}/presentation.html`);
  if (!res.ok) {
    await res.body?.cancel();
    return null;
  }
  const html = (await res.text())
    .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, "")
    .replace(/\s*·\s*N notes/g, "");
  if (LEFTOVER_NOTES.some((re) => re.test(html))) return null;
  // Shown inside the showcase page's overlay, which has its own close button:
  // the deck's toolbar buttons are hidden (not removed, its script still binds
  // them) and the keyboard, click and swipe navigation keep working.
  return html.replace(
    /<\/head>/i,
    '<meta name="robots" content="noindex"><style>#notes,#bar,button{display:none!important}</style></head>'
  );
};

const decks = new Map<string, Cached<string | null>>();

export const getPresentation = async (slug: string) => {
  if (!SLUG.test(slug)) return null;
  let deck = decks.get(slug);
  if (!deck) {
    deck = cached(() => loadPresentation(slug));
    decks.set(slug, deck);
  }
  try {
    return await deck.get();
  } catch {
    return null;
  }
};

const str = (v: unknown) =>
  typeof v === "string" && v.trim() ? v.trim() : null;
const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const strings = (v: unknown) =>
  Array.isArray(v) ? v.map(str).filter((s): s is string => s !== null) : [];
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};

// Opens the business itself on Google Maps: a Place ID search lands on its
// profile. A stored mapsUrl is used only without a Place ID, and never when
// it is a directions link (/maps/dir/), which opens a route instead.
const mapsUrlOf = (business: Record<string, unknown>, slug: string) => {
  const placeId = str(business.placeId);
  const address = str(business.address);
  const search = (params: Record<string, string>) =>
    `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", ...params })}`;
  const query = [str(business.name) ?? slug, address].filter(Boolean).join(", ");
  if (placeId) return search({ query, query_place_id: placeId });
  const stored = str(business.mapsUrl);
  if (
    stored &&
    !/\/maps\/dir\//i.test(stored) &&
    /^https:\/\/(www\.)?(google\.[a-z.]+|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl)\//i.test(stored)
  ) {
    return stored;
  }
  return address ? search({ query }) : null;
};

// "123 Main St, Orlando, FL 32801" -> "Orlando, FL"
const cityOf = (address: string | null) => {
  const parts = address?.split(",").map((p) => p.trim()) ?? [];
  if (parts.length < 3) return null;
  const state = parts[parts.length - 1]!.replace(/\s*\d{5}(-\d{4})?$/, "");
  return `${parts[parts.length - 2]}, ${state}`;
};

const readMeta = async (slug: string) => {
  const conn = r2();
  if (!conn) return null;
  const res = await conn.client.fetch(`${conn.base}/${slug}/_meta.json`);
  if (!res.ok) {
    await res.body?.cancel();
    return null;
  }
  try {
    return obj(await res.json());
  } catch {
    return null;
  }
};

const toProject = (
  slug: string,
  meta: Record<string, unknown>,
  keys: Set<string>,
  createdAt: string | null
): ShowcaseProject | null => {
  const business = obj(meta.business);
  const showcase = obj(meta.showcase);
  if (showcase.hidden === true) return null;
  const address = str(business.address);
  const category = str(business.category);
  return {
    slug,
    name: str(business.name) ?? str(meta.name) ?? slug,
    category,
    industry: industryOf(str(showcase.industry), category),
    address,
    mapsUrl: mapsUrlOf(business, slug),
    city: cityOf(address),
    rating: num(business.rating),
    reviewCount: num(business.reviewCount),
    hours: strings(business.hours),
    title: str(showcase.title),
    summary:
      str(showcase.summary) ??
      str(showcase.description) ??
      str(meta.description),
    features: strings(showcase.features),
    hasVideo: keys.has(`${slug}/preview.mp4`),
    hasPoster: keys.has(`${slug}/preview.jpg`),
    hasPresentation: keys.has(`${slug}/presentation.html`),
    uploadedAt: str(meta.uploadedAt),
    createdAt,
  };
};

const load = async () => {
  const { slugs, keys } = await listBucket();
  const projects = await Promise.all(
    [...slugs].map(async ([slug, createdAt]) =>
      toProject(
        slug,
        keys.has(`${slug}/_meta.json`) ? ((await readMeta(slug)) ?? {}) : {},
        keys,
        createdAt || null
      )
    )
  );
  return projects
    .filter((p): p is ShowcaseProject => p !== null)
    // newest first by R2 creation time; ISO strings compare as dates
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
};

const projects = cached(async () => {
  const list = await load();
  // warm the decks too, so opening a project never waits on R2
  for (const p of list) if (p.hasPresentation) void getPresentation(p.slug);
  return list;
});

export const listShowcase = async (): Promise<ShowcaseProject[]> => {
  if (!r2()) return [];
  try {
    return await projects.get();
  } catch (err) {
    console.error("showcase:", err);
    return [];
  }
};

export const getShowcase = async (slug: string) =>
  (await listShowcase()).find((p) => p.slug === slug) ?? null;

export const mediaUrl = (slug: string, file: MediaFile) =>
  `/showcase/media/${slug}/${file}`;
