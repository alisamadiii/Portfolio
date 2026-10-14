/**
 * Browser-side prep for chat image uploads: decode, EXIF-upright, downscale
 * to a web size and re-encode, so a phone photo lands under the 1 MB cap the
 * server enforces. No server-side image processing exists (no sharp).
 */

export const MAX_UPLOAD_BYTES = 1_048_576;
/** Longest side after shrinking. Never enlarges. */
export const MAX_EDGE = 2000;

export type ShrinkResult =
  | { ok: true; blob: Blob; width: number; height: number; fileName: string }
  | {
      ok: false;
      reason: "too-large" | "svg" | "heic" | "not-image" | "decode";
    };

const HEIC = /\.(heic|heif)$/i;

const stem = (name: string) => name.replace(/\.[^.]+$/, "") || "image";

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) =>
    canvas.toBlob((blob) => resolve(blob), type, quality)
  );

export async function shrinkImage(file: File): Promise<ShrinkResult> {
  const type = file.type.toLowerCase();
  if (type === "image/svg+xml" || /\.svg$/i.test(file.name)) {
    return { ok: false, reason: "svg" };
  }
  if (type === "image/heic" || type === "image/heif" || HEIC.test(file.name)) {
    return { ok: false, reason: "heic" };
  }
  if (!type.startsWith("image/")) {
    return { ok: false, reason: "not-image" };
  }

  // GIFs pass through untouched so animation survives; only the cap applies.
  if (type === "image/gif") {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      return { ok: false, reason: "decode" };
    }
    const { width, height } = bitmap;
    bitmap.close();
    if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: "too-large" };
    return { ok: true, blob: file, width, height, fileName: file.name };
  }

  let bitmap: ImageBitmap;
  try {
    // from-image applies the EXIF orientation so phone shots come out upright.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return { ok: false, reason: "decode" };
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return { ok: false, reason: "decode" };
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob = await toBlob(canvas, "image/webp", 0.82);
  let ext = "webp";
  if (!blob || blob.type !== "image/webp") {
    // Older Safari cannot encode WebP: flatten alpha onto white and use JPEG.
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    blob = await toBlob(canvas, "image/jpeg", 0.85);
    ext = "jpg";
  }
  if (!blob) return { ok: false, reason: "decode" };
  if (blob.size > MAX_UPLOAD_BYTES) return { ok: false, reason: "too-large" };
  return {
    ok: true,
    blob,
    width,
    height,
    fileName: `${stem(file.name)}.${ext}`,
  };
}
