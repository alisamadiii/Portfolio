import "server-only";

import { AwsClient } from "aws4fetch";
import { TRPCError } from "@trpc/server";

// Direct R2 access for the media library — ported from the retired agency-api
// Worker (apps/api). One agency bucket from env instead of per-user settings.

const PUT_EXPIRES_IN = 900; // presigned PUT: 15 min

let cached: {
  client: AwsClient;
  base: string;
  bucket: string;
  publicBaseUrl: string;
} | null = null;

export function r2() {
  if (!cached) {
    const {
      R2_ENDPOINT,
      R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY,
      R2_BUCKET,
      R2_PUBLIC_BASE_URL,
    } = process.env;
    if (
      !R2_ENDPOINT ||
      !R2_ACCESS_KEY_ID ||
      !R2_SECRET_ACCESS_KEY ||
      !R2_BUCKET ||
      !R2_PUBLIC_BASE_URL
    ) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "R2 storage is not configured (R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET / R2_PUBLIC_BASE_URL).",
      });
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
      publicBaseUrl: R2_PUBLIC_BASE_URL.replace(/\/+$/, ""),
    };
  }
  return cached;
}

// strip leading/trailing slashes, collapse dupes, reject traversal
function cleanPath(raw?: string): string {
  if (!raw) return "";
  const trimmed = raw.replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
  if (trimmed.split("/").some((seg) => seg === ".." || seg === ".")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "path: must not contain . or .. segments",
    });
  }
  return trimmed;
}

// ".jpg" (sanitized) or "" when the name has no extension
function fileExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0
    ? name
        .slice(dot)
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, "")
    : "";
}

// keep extension, slugify the rest
function safeFilename(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = fileExt(name);
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return (base || "file") + ext;
}

export async function presignUpload(input: {
  filename: string;
  contentType: string;
  contentLength: number;
  path?: string;
  naming?: "filename" | "uuid" | "uuid-filename";
  overwrite?: boolean;
}) {
  const { client, base, bucket, publicBaseUrl } = r2();
  const naming = input.naming ?? "filename";

  const prefix = cleanPath(input.path);
  const objectName =
    naming === "filename"
      ? safeFilename(input.filename)
      : naming === "uuid"
        ? crypto.randomUUID() + fileExt(input.filename)
        : `${crypto.randomUUID()}-${safeFilename(input.filename)}`;
  const key = `${prefix ? prefix + "/" : ""}${objectName}`;

  // Only filename mode can collide — UUID keys are unique by construction.
  if (naming === "filename" && !input.overwrite) {
    const head = await client.fetch(`${base}/${bucket}/${encodeURI(key)}`, {
      method: "HEAD",
    });
    if (head.ok) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `An object named "${key}" already exists. Pass overwrite: true to replace it, or use naming "uuid-filename" / "uuid".`,
      });
    }
  }

  const signed = await client.sign(
    new Request(`${base}/${bucket}/${key}?X-Amz-Expires=${PUT_EXPIRES_IN}`, {
      method: "PUT",
      headers: {
        "Content-Type": input.contentType,
        "Content-Length": String(input.contentLength),
      },
    }),
    { aws: { signQuery: true } }
  );

  return {
    uploadUrl: signed.url,
    method: "PUT" as const,
    bucket,
    key,
    naming,
    // Durable URL to display the object. Store this, not the uploadUrl.
    publicUrl: `${publicBaseUrl}/${key}`,
    expiresIn: PUT_EXPIRES_IN,
    headers: {
      "Content-Type": input.contentType,
      "Content-Length": String(input.contentLength),
    },
  };
}

// Accept a bare object key or a full URL and resolve it to the key.
function resolveKey(input: string): string {
  const { base, bucket, publicBaseUrl } = r2();
  if (!/^https?:\/\//i.test(input)) return input.replace(/^\/+/, "");
  const stripQuery = (s: string) => s.split("?")[0]!;
  // Known bases first: R2 endpoint URLs carry the bucket name in the path,
  // so a plain pathname split would resolve them to the wrong key.
  const bases = [publicBaseUrl + "/", `${base}/${bucket}/`];
  for (const b of bases) {
    if (input.startsWith(b)) {
      const key = decodeURIComponent(stripQuery(input.slice(b.length)));
      if (key) return key;
    }
  }
  try {
    const key = decodeURIComponent(
      stripQuery(new URL(input).pathname).replace(/^\/+/, "")
    );
    if (key) return key;
  } catch {
    // Fall through to the error below.
  }
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "The URL contains no object key.",
  });
}

// Server-side delete. R2's DELETE is idempotent — succeeds whether or not the
// key existed.
export async function deleteObject(keyOrUrl: string) {
  const { client, base, bucket } = r2();
  const key = resolveKey(keyOrUrl);

  const res = await client.fetch(`${base}/${bucket}/${encodeURI(key)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Storage delete failed (${res.status})`,
    });
  }
}

// List objects in the bucket. Served from the public base URL, so each entry
// carries its durable public URL — no expiring presigned links.
export async function listObjects(input: { prefix?: string; cursor?: string }) {
  const { client, base, bucket, publicBaseUrl } = r2();

  const params = new URLSearchParams({ "list-type": "2", "max-keys": "100" });
  if (input.prefix) params.set("prefix", input.prefix);
  if (input.cursor) params.set("continuation-token", input.cursor);

  const res = await client.fetch(`${base}/${bucket}?${params.toString()}`);
  if (!res.ok) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Storage list failed (${res.status})`,
    });
  }
  const xml = await res.text();

  // Parse each <Contents> block, then pull fields out of it (order-independent).
  const blocks = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)]
    .map((m) => {
      const b = m[1]!;
      return {
        key: /<Key>(.*?)<\/Key>/.exec(b)?.[1] ?? "",
        lastModified: /<LastModified>(.*?)<\/LastModified>/.exec(b)?.[1] ?? "",
        size: Number(/<Size>(.*?)<\/Size>/.exec(b)?.[1] ?? "0"),
      };
    })
    .filter((o) => o.key);

  const objects = blocks.map((o) => ({ ...o, url: `${publicBaseUrl}/${o.key}` }));

  const nextCursor = /<IsTruncated>true<\/IsTruncated>/.test(xml)
    ? (xml.match(/<NextContinuationToken>(.*?)<\/NextContinuationToken>/)?.[1] ??
      null)
    : null;

  return { objects, nextCursor };
}
