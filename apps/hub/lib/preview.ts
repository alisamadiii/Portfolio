import { Config } from "@workspace/cms-core/types/config";

export type PreviewTarget = {
  /** Full iframe URL including the `?cms-preview=1` flag. */
  href: string;
  /** Origin to target `postMessage` at (never `"*"`). */
  origin: string;
};

/**
 * Per-entry context used to interpolate route tokens in `preview.paths`.
 * `slug` is the entry's filename (minus extension); `fields` are its values.
 */
export type PreviewContext = {
  slug?: string;
  fields?: Record<string, unknown>;
};

/**
 * Interpolate `{...}` tokens in a preview path template.
 *
 * Supported tokens:
 * - `{slug}` — the entry's `slug` field if present, else the filename slug.
 * - `{fields.<name>}` / `{<name>}` — any field value on the entry.
 *
 * This lets a **collection** (whose entries share one `name`) route each entry
 * to its own page — e.g. `legal: /{slug}` or `newsletters: /newsletter/{slug}`.
 * Unknown tokens resolve to an empty string.
 */
function interpolatePath(template: string, context?: PreviewContext): string {
  return template.replace(/\{([^}]+)\}/g, (_match, raw: string) => {
    const token = raw.trim();
    let value: unknown;
    if (token === "slug") {
      value = context?.fields?.slug ?? context?.slug;
    } else if (token.startsWith("fields.")) {
      value = context?.fields?.[token.slice("fields.".length)];
    } else {
      value = context?.fields?.[token];
    }
    return value == null ? "" : encodeURIComponent(String(value));
  });
}

/**
 * Resolve the live-preview URL for a content entry from the site's `.pages.yml`.
 *
 * Reads `settings.baseUrl` (the site's live URL) and an optional
 * `settings.preview.paths` map that overrides the route per entry name.
 * Route defaults to `/` for the `home` entry, otherwise `/<entryName>`.
 *
 * A path may contain `{slug}` / `{fields.<name>}` tokens interpolated from
 * `context` — needed for collections where each entry has its own route.
 *
 * Returns `null` when no `baseUrl` is configured — the preview panel then hides.
 */
export function getPreviewUrl(
  config: Config | null,
  entryName: string,
  context?: PreviewContext
): PreviewTarget | null {
  const settings = config?.object?.settings;
  const baseUrl: unknown = settings?.baseUrl;
  if (!baseUrl || typeof baseUrl !== "string" || !entryName) return null;

  const overrides: Record<string, string> | undefined =
    settings?.preview?.paths;
  const template =
    overrides?.[entryName] ?? (entryName === "home" ? "/" : `/${entryName}`);
  const path = template.includes("{")
    ? interpolatePath(template, context)
    : template;

  try {
    const url = new URL(path, baseUrl);
    url.searchParams.set("cms-preview", "1");
    return { href: url.href, origin: url.origin };
  } catch {
    return null;
  }
}
