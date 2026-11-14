import "server-only";

import { AwsClient } from "aws4fetch";
import { TRPCError } from "@trpc/server";
import z from "zod";

import {
  CLIENT_WEBSITES_BUCKET,
  INDEX_FILE,
  importPath,
  isSafeKey,
  META_FILE,
  PRESENTATION_FILE,
  PREVIEW_VIDEO_FILE,
  SLUG,
  type ClientWebsite,
  type ClientWebsiteDetail,
} from "./client-websites-shared";

// ─── Client websites (server) ────────────────────────────────────
// Reads the client-websites R2 bucket with the api's own R2 keys (they reach
// every bucket). Admin hub page: routers/client-websites.ts. File serving for
// the preview iframe: apps/api/app/client-websites.

let cached: { client: AwsClient; base: string } | null = null;

function r2() {
  if (!cached) {
    const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
    if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "R2 storage is not configured (R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY).",
      });
    }
    cached = {
      client: new AwsClient({
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
        service: "s3",
        region: "auto",
      }),
      base: `${R2_ENDPOINT.replace(/\/+$/, "")}/${CLIENT_WEBSITES_BUCKET}`,
    };
  }
  return cached;
}

const objectUrl = (key: string) => {
  if (!isSafeKey(key)) throw new Error(`Unsafe object key: ${key}`);
  return `${r2().base}/${key.split("/").map(encodeURIComponent).join("/")}`;
};

const unescapeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

// Every page of a ListObjectsV2 call, as raw XML.
const listPages = async (params: Record<string, string>) => {
  const { client, base } = r2();
  const pages: string[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ "list-type": "2", ...params });
    if (cursor) query.set("continuation-token", cursor);
    const res = await client.fetch(`${base}?${query.toString()}`);
    if (!res.ok) throw new Error(`Storage list failed (${res.status})`);
    const xml = await res.text();
    pages.push(xml);
    cursor = /<IsTruncated>true<\/IsTruncated>/.test(xml)
      ? unescapeXml(
          xml.match(/<NextContinuationToken>(.*?)<\/NextContinuationToken>/)?.[1] ?? ""
        ) || null
      : null;
  } while (cursor);
  return pages;
};

// Top-level "folders" in the bucket, without the trailing slash.
const listFolders = async () => {
  const pages = await listPages({ delimiter: "/" });
  return pages.flatMap((xml) =>
    [...xml.matchAll(/<CommonPrefixes>\s*<Prefix>(.*?)<\/Prefix>\s*<\/CommonPrefixes>/g)].map(
      (m) => unescapeXml(m[1]!).replace(/\/$/, "")
    )
  );
};

// Every object key under a prefix.
export const listKeys = async (prefix: string) => {
  const pages = await listPages({ prefix });
  return pages.flatMap((xml) =>
    [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)]
      .map((m) => unescapeXml(/<Key>(.*?)<\/Key>/.exec(m[1]!)?.[1] ?? ""))
      .filter(Boolean)
  );
};

// Raw R2 response: the caller checks status and streams the body.
export const getObject = (key: string, headers?: Record<string, string>) =>
  r2().client.fetch(objectUrl(key), { headers });

export const headObject = (key: string) =>
  r2().client.fetch(objectUrl(key), { method: "HEAD" });

// ─── _meta.json ──────────────────────────────────────────────────

const metaSchema = z.object({
  version: z.number().optional(),
  name: z.string().min(1),
  uploadedAt: z.string().optional(),
  design: z
    .object({
      chatUrl: z.string().optional(),
      title: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
  business: z
    .object({
      placeId: z.string().optional(),
      name: z.string().optional(),
      address: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
      rating: z.number().optional(),
      reviewCount: z.number().optional(),
      mapsUrl: z.string().optional(),
      category: z.string().optional(),
      hours: z.array(z.string()).optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    })
    .optional(),
  showcase: z
    .object({
      title: z.string().optional(),
      summary: z.string().optional(),
      features: z.array(z.string()).optional(),
      industry: z.string().optional(),
      hidden: z.boolean().optional(),
    })
    .optional(),
});

const readWebsite = async (slug: string): Promise<ClientWebsite> => {
  const res = await getObject(`${slug}/${META_FILE}`);
  if (res.status === 404) {
    await res.body?.cancel();
    return { slug, meta: null, metaStatus: "missing", updatedAt: null };
  }
  if (!res.ok) throw new Error(`Storage get failed (${res.status})`);

  const lastModified = res.headers.get("last-modified");
  const modifiedAt = lastModified ? new Date(lastModified).toISOString() : null;
  const parsed = metaSchema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) {
    return { slug, meta: null, metaStatus: "invalid", updatedAt: modifiedAt };
  }
  return {
    slug,
    meta: parsed.data,
    metaStatus: "ok",
    updatedAt: parsed.data.uploadedAt ?? modifiedAt,
  };
};

const time = (value: string | null) => (value && Date.parse(value)) || 0;

/** Every client website, newest first (folders without a date last). */
export async function listWebsites() {
  const slugs = (await listFolders()).filter((slug) => SLUG.test(slug));
  const websites = await Promise.all(slugs.map(readWebsite));
  return websites.sort(
    (a, b) => time(b.updatedAt) - time(a.updatedAt) || a.slug.localeCompare(b.slug)
  );
}

export async function getWebsite(slug: string): Promise<ClientWebsiteDetail> {
  const [website, keys] = await Promise.all([readWebsite(slug), listKeys(`${slug}/`)]);
  if (keys.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Website not found." });
  }

  const html = keys
    .filter((key) => key.endsWith(".html"))
    .map((key) => key.slice(slug.length + 1));
  // the deck is opened from its own button, not listed as a site page
  const pages = html
    .filter((page) => page !== PRESENTATION_FILE)
    .sort(
      (a, b) =>
        Number(b === INDEX_FILE) - Number(a === INDEX_FILE) || a.localeCompare(b)
    );
  return {
    ...website,
    pages,
    hasPresentation: html.includes(PRESENTATION_FILE),
    hasPreviewVideo: keys.includes(`${slug}/${PREVIEW_VIDEO_FILE}`),
  };
}

/** Import: the site's own files (no _meta.json / deck / video), path -> bytes. */
export async function readSiteFiles(slug: string) {
  const keys = await listKeys(`${slug}/`);
  const entries = keys.flatMap((key) => {
    const path = importPath(slug, key);
    return path ? [{ key, path }] : [];
  });
  if (!entries.some((e) => e.path === INDEX_FILE)) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This website has no index.html at the top of its folder.",
    });
  }
  const files: Record<string, Uint8Array> = {};
  // a few at a time: designs are dozens of small files
  for (let i = 0; i < entries.length; i += 8) {
    await Promise.all(
      entries.slice(i, i + 8).map(async ({ key, path }) => {
        const res = await getObject(key);
        if (!res.ok) throw new Error(`Storage get failed for ${key} (${res.status})`);
        files[path] = new Uint8Array(await res.arrayBuffer());
      })
    );
  }
  return files;
}
