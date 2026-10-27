// ─── Allowed origins for the capture + booking scripts ───────────
// An agency client lists the hostnames its leads.js / booking.js may post from, so a
// leaked form key can't be used from another site. Pure helpers, shared by the
// public endpoints (apps/api) and the hub.

/** Hostname of a URL, origin, or bare domain; null when unparseable. */
export const hostOf = (value: string | null | undefined): string | null => {
  if (!value) return null;
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).hostname;
  } catch {
    return null;
  }
};

/** Compare hosts ignoring a leading www. and case. */
const normalizeHost = (host: string) => host.toLowerCase().replace(/^www\./, "");

/**
 * Normalize a user-entered domain to a bare hostname for storage
 * ("https://www.Example.com/x" -> "example.com"); null when it has no host.
 */
export const normalizeOrigin = (value: string): string | null => {
  const host = hostOf(value.trim());
  return host ? normalizeHost(host) : null;
};

/** True when the request host is in the client's allowed list (www-insensitive). */
export function isOriginAllowed(
  origins: string[] | null | undefined,
  host: string | null
): boolean {
  if (!host || !origins?.length) return false;
  const target = normalizeHost(host);
  return origins.some((o) => {
    const h = hostOf(o);
    return h ? normalizeHost(h) === target : false;
  });
}
