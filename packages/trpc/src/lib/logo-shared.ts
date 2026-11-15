// Client-safe logo constants + checks (the hub and the server share them).

/** Hard cap after the hub's resize (512px WebP is usually 10–40 KB). */
export const LOGO_MAX_BYTES = 300 * 1024;

/** Longest edge the hub resizes a logo to before upload. */
export const LOGO_MAX_EDGE = 512;

export const logoPrefix = (projectId: string) => `logos/${projectId}/`;

export type LogoType = "image/webp" | "image/png" | "image/jpeg";

/** The image type from the file's magic bytes; null for anything else (SVG included). */
export function sniffLogoType(bytes: Uint8Array): LogoType | null {
  const at = (i: number) => bytes[i];
  if (at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47) {
    return "image/png";
  }
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "image/jpeg";
  if (
    at(0) === 0x52 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x46 &&
    at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50
  ) {
    return "image/webp";
  }
  return null;
}
