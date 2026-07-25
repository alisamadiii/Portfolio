import { Config } from "@/types/config";

export type PreviewTarget = {
  /** Full iframe URL including the `?cms-preview=1` flag. */
  href: string;
  /** Origin to target `postMessage` at (never `"*"`). */
  origin: string;
};

/**
 * Resolve the live-preview URL for a content entry from the site's `.pages.yml`.
 *
 * Reads `settings.baseUrl` (the site's live URL) and an optional
 * `settings.preview.paths` map that overrides the route per entry name.
 * Route defaults to `/` for the `home` entry, otherwise `/<entryName>`.
 *
 * Returns `null` when no `baseUrl` is configured — the preview panel then hides.
 */
export function getPreviewUrl(
  config: Config | null,
  entryName: string
): PreviewTarget | null {
  const settings = config?.object?.settings;
  const baseUrl: unknown = settings?.baseUrl;
  if (!baseUrl || typeof baseUrl !== "string" || !entryName) return null;

  const overrides: Record<string, string> | undefined =
    settings?.preview?.paths;
  const path =
    overrides?.[entryName] ?? (entryName === "home" ? "/" : `/${entryName}`);

  try {
    const url = new URL(path, baseUrl);
    url.searchParams.set("cms-preview", "1");
    return { href: url.href, origin: url.origin };
  } catch {
    return null;
  }
}
