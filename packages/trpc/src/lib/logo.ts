import "server-only";

import { createHash } from "node:crypto";

import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { db } from "@workspace/drizzle/pool";
import { hubProject } from "@workspace/drizzle/schema";

import { LOGO_MAX_BYTES, logoPrefix, sniffLogoType } from "./logo-shared";
import { deleteObject, listAllObjects, publicObjectUrl, putObject } from "./r2";

// Business logo in the public R2 bucket. The hub shrinks it to a small WebP
// before upload; the server re-checks size + magic bytes. One object per
// project at logos/<projectId>/<content-hash>.<ext>: the hashed name lets it
// be cached forever, and every set/remove deletes everything else under the
// project's prefix, so storage never holds more than one logo per project.

const CACHE_FOREVER = "public, max-age=31536000, immutable";

const EXT = { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg" } as const;

/** Delete every logo object under the project's prefix except `keep`. */
async function sweep(projectId: string, keep: string | null) {
  try {
    const objects = await listAllObjects(logoPrefix(projectId));
    await Promise.all(
      objects.filter((o) => o.key !== keep).map((o) => deleteObject(o.key))
    );
  } catch (error) {
    // Best effort: the next set/remove sweeps again.
    console.error("[logo] sweep failed", projectId, error);
  }
}

export async function setProjectLogo(projectId: string, bytes: Uint8Array) {
  if (bytes.byteLength === 0 || bytes.byteLength > LOGO_MAX_BYTES) {
    throw new TRPCError({
      code: "PAYLOAD_TOO_LARGE",
      message: "That logo is too big. Try a smaller image.",
    });
  }
  const type = sniffLogoType(bytes);
  if (!type) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Use a PNG, JPG or WebP image.",
    });
  }

  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  const key = `${logoPrefix(projectId)}${hash}.${EXT[type]}`;

  await putObject(key, bytes, type, { cacheControl: CACHE_FOREVER });
  await db.update(hubProject).set({ logoKey: key }).where(eq(hubProject.id, projectId));
  await sweep(projectId, key);

  return { logoUrl: publicObjectUrl(key) };
}

export async function removeProjectLogo(projectId: string) {
  await db.update(hubProject).set({ logoKey: null }).where(eq(hubProject.id, projectId));
  await sweep(projectId, null);
  return { logoUrl: null };
}

/** Project deleted: drop its logo objects (the row goes with the project). */
export const deleteProjectLogos = (projectId: string) => sweep(projectId, null);
