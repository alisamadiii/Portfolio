import { AwsClient } from "aws4fetch";

// R2 access over the S3-compatible API, same approach as
// packages/trpc/src/lib/r2.ts but for the client-websites bucket and with
// folder (delimiter) listing.

let cached: { client: AwsClient; base: string; bucket: string } | null = null;

const r2 = () => {
  if (!cached) {
    const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } =
      process.env;
    if (
      !R2_ENDPOINT ||
      !R2_ACCESS_KEY_ID ||
      !R2_SECRET_ACCESS_KEY ||
      !R2_BUCKET
    ) {
      throw new Error(
        "R2 storage is not configured (R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET)."
      );
    }
    cached = {
      client: new AwsClient({
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
        service: "s3",
        region: "auto",
      }),
      base: R2_ENDPOINT.replace(/\/+$/, ""),
      bucket: R2_BUCKET,
    };
  }
  return cached;
};

// Keys are flat strings in R2 but become URL paths here, where "." and ".."
// segments would be resolved by the URL parser and escape the prefix (or the
// bucket). Every key passes through this before it reaches a request.
export const isSafeKey = (key: string) =>
  key.length > 0 &&
  key
    .split("/")
    .every((seg) => seg !== "" && seg !== "." && seg !== ".." && !seg.includes("\\"));

const objectUrl = (key: string) => {
  if (!isSafeKey(key)) throw new Error(`Unsafe object key: ${key}`);
  const { base, bucket } = r2();
  return `${base}/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
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
  const { client, base, bucket } = r2();
  const pages: string[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ "list-type": "2", ...params });
    if (cursor) query.set("continuation-token", cursor);
    const res = await client.fetch(`${base}/${bucket}?${query.toString()}`);
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
export const listFolders = async () => {
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

export const putObject = async (
  key: string,
  body: Uint8Array | string,
  contentType: string
) => {
  const res = await r2().client.fetch(objectUrl(key), {
    method: "PUT",
    headers: { "Content-Type": contentType },
    // Node's Buffer is a valid fetch body; the DOM lib's BodyInit disagrees
    body: body as BodyInit,
  });
  if (!res.ok) throw new Error(`Storage put failed for ${key} (${res.status})`);
};

// R2's DELETE is idempotent: succeeds whether or not the key existed.
export const deleteObject = async (key: string) => {
  const res = await r2().client.fetch(objectUrl(key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Storage delete failed for ${key} (${res.status})`);
  }
};
