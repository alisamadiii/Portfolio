import { Hono } from "hono";
import { z } from "zod";

import type { User } from "../db/schema.js";
import { ApiError } from "../lib/errors.js";
import { r2Client } from "../lib/r2.js";
import { parseBody } from "../lib/validate.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";

// Uploads go to the caller's own bucket (users.bucketName) — the client never
// picks a bucket.

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB
const PUT_EXPIRES_IN = 900; // presigned PUT: 15 min

const presignSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  contentLength: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  path: z.string().optional(),
  // How the object key is built: "filename" = photo.jpg, "uuid" = <uuid>.jpg,
  // "uuid-filename" = <uuid>-photo.jpg.
  naming: z.enum(["filename", "uuid", "uuid-filename"]).default("filename"),
  // filename mode only: replace an existing object instead of 409ing.
  overwrite: z.boolean().default(false),
});

const deleteSchema = z.object({
  key: z.string().min(1),
});

// The caller's bucket + public URL, or a readable 403 if none is configured.
function requireBucket(user: User): { bucket: string; publicBaseUrl: string } {
  if (!user.bucketName || !user.publicBaseUrl) {
    throw new ApiError(
      403,
      "BUCKET_NOT_CONFIGURED",
      "Your account has no storage bucket configured.",
      "Ask an admin to set bucketName + publicBaseUrl on your user (PATCH /v1/admin/users/:id)."
    );
  }
  return { bucket: user.bucketName, publicBaseUrl: user.publicBaseUrl };
}

// strip leading/trailing slashes, collapse dupes, reject traversal
function cleanPath(raw?: string): string {
  if (!raw) return "";
  const trimmed = raw.replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
  if (trimmed.split("/").some((seg) => seg === ".." || seg === ".")) {
    throw new ApiError(
      400,
      "INVALID_PATH",
      "path: must not contain . or .. segments"
    );
  }
  return trimmed;
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

export const uploads = new Hono<AppEnv>();

uploads.use("*", requireAuth);

// Presigned R2 PUT url for a direct browser upload.
uploads.post("/presign", async (c) => {
  const { filename, contentType, contentLength, path, naming, overwrite } =
    await parseBody(c, presignSchema);
  const { bucket, publicBaseUrl } = requireBucket(c.get("user"));
  const { client, base } = r2Client(c.env);

  const prefix = cleanPath(path);
  const objectName =
    naming === "filename"
      ? safeFilename(filename)
      : naming === "uuid"
        ? crypto.randomUUID() + fileExt(filename)
        : `${crypto.randomUUID()}-${safeFilename(filename)}`;
  const key = `${prefix ? prefix + "/" : ""}${objectName}`;

  // Only filename mode can collide — UUID keys are unique by construction.
  if (naming === "filename" && !overwrite) {
    const head = await client.fetch(`${base}/${bucket}/${encodeURI(key)}`, {
      method: "HEAD",
    });
    if (head.ok) {
      throw new ApiError(
        409,
        "FILE_ALREADY_EXISTS",
        `An object named "${key}" already exists in your bucket.`,
        'Pass "overwrite": true to replace it, or use naming "uuid-filename" / "uuid" for a unique key.'
      );
    }
  }

  const signed = await client.sign(
    new Request(`${base}/${bucket}/${key}?X-Amz-Expires=${PUT_EXPIRES_IN}`, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(contentLength),
      },
    }),
    { aws: { signQuery: true } }
  );

  return c.json({
    uploadUrl: signed.url,
    method: "PUT",
    bucket,
    key,
    naming,
    // Durable URL to display the object. Store this, not the uploadUrl.
    publicUrl: `${publicBaseUrl.replace(/\/+$/, "")}/${key}`,
    expiresIn: PUT_EXPIRES_IN,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(contentLength),
    },
  });
});

// Accept a bare object key or a full URL and resolve it to the key. The URL's
// host is NOT validated against the caller's bucket — a bucket can be served
// from several domains (custom domain, pub-*.r2.dev, ...), and the delete
// itself only ever targets the caller's own bucket, so a foreign URL is at
// worst a no-op.
function resolveKey(
  input: string,
  publicBaseUrl: string,
  r2Base: string,
  bucket: string
): string {
  // Bare key — tolerate a leading slash ("/avatars/x.jpg" = "avatars/x.jpg").
  if (!/^https?:\/\//i.test(input)) return input.replace(/^\/+/, "");
  const stripQuery = (s: string) => s.split("?")[0];
  // Known bases first: R2 endpoint URLs carry the bucket name in the path,
  // so a plain pathname split would resolve them to the wrong key.
  const bases = [
    publicBaseUrl.replace(/\/+$/, "") + "/",
    `${r2Base}/${bucket}/`,
  ];
  for (const b of bases) {
    if (input.startsWith(b)) {
      const key = decodeURIComponent(stripQuery(input.slice(b.length)));
      if (key) return key;
    }
  }
  // Any other URL: the path is the key.
  try {
    const key = decodeURIComponent(
      stripQuery(new URL(input).pathname).replace(/^\/+/, "")
    );
    if (key) return key;
  } catch {
    // Fall through to the error below.
  }
  throw new ApiError(
    400,
    "INVALID_KEY",
    "The URL contains no object key.",
    `Pass the bare object key ("avatars/x.jpg") or the file's URL (e.g. ${publicBaseUrl}/avatars/x.jpg).`
  );
}

// Server-side delete: Worker signs + sends DELETE to R2 (no presigned URL).
// R2's DELETE is idempotent — 204 whether or not the key existed. No
// existence pre-check on purpose: it doubled the R2 round-trips just to turn
// a no-op into a 404.
uploads.delete("/", async (c) => {
  const body = await parseBody(c, deleteSchema);
  const { bucket, publicBaseUrl } = requireBucket(c.get("user"));
  const { client, base } = r2Client(c.env);
  const key = resolveKey(body.key, publicBaseUrl, base, bucket);

  const objectUrl = `${base}/${bucket}/${encodeURI(key)}`;
  const res = await client.fetch(objectUrl, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new ApiError(
      502,
      "STORAGE_DELETE_FAILED",
      `Storage delete failed (${res.status})`,
      "R2 rejected the request. Likely a server-side credentials or bucket-name problem."
    );
  }

  return c.body(null, 204);
});

// List objects in the caller's bucket. Objects are served from the user's
// verified publicBaseUrl, so each entry carries its durable public URL —
// no expiring presigned links.
uploads.get("/objects", async (c) => {
  const { bucket, publicBaseUrl } = requireBucket(c.get("user"));
  const { client, base } = r2Client(c.env);

  const params = new URLSearchParams({ "list-type": "2", "max-keys": "100" });
  const prefix = c.req.query("prefix");
  if (prefix) params.set("prefix", prefix);
  const cursor = c.req.query("cursor");
  if (cursor) params.set("continuation-token", cursor);

  const res = await client.fetch(`${base}/${bucket}?${params.toString()}`);
  if (!res.ok) {
    throw new ApiError(
      502,
      "STORAGE_LIST_FAILED",
      `Storage list failed (${res.status})`,
      "R2 rejected the request. Likely a server-side credentials or bucket-name problem."
    );
  }
  const xml = await res.text();

  // Parse each <Contents> block, then pull fields out of it (order-independent).
  const blocks = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)]
    .map((m) => {
      const b = m[1];
      return {
        key: /<Key>(.*?)<\/Key>/.exec(b)?.[1] ?? "",
        lastModified: /<LastModified>(.*?)<\/LastModified>/.exec(b)?.[1] ?? "",
        size: Number(/<Size>(.*?)<\/Size>/.exec(b)?.[1] ?? "0"),
      };
    })
    .filter((o) => o.key);

  const publicBase = publicBaseUrl.replace(/\/+$/, "");
  const objects = blocks.map((o) => ({ ...o, url: `${publicBase}/${o.key}` }));

  const nextCursor = /<IsTruncated>true<\/IsTruncated>/.test(xml)
    ? (xml.match(
        /<NextContinuationToken>(.*?)<\/NextContinuationToken>/
      )?.[1] ?? null)
    : null;

  return c.json({ objects, nextCursor });
});
