/**
 * Can a site be shown inside an iframe on `origin` (the hub)? Sites that send
 * X-Frame-Options or a CSP frame-ancestors directive refuse cross-origin
 * framing, and the browser won't tell the parent page why an iframe stayed
 * blank, so the hub asks the server, which reads the response headers.
 */

export type FramePolicy = "frameable" | "blocked" | "unreachable";

/** A frame-ancestors source matches `origin` (scheme, exact origin, or *.host wildcard). */
const sourceAllows = (source: string, origin: URL): boolean => {
  const value = source.trim().toLowerCase();
  if (value === "*") return true;
  if (value === `${origin.protocol}`) return true; // e.g. "https:"
  const match = /^(?:(https?):\/\/)?(\*\.)?([^/:]+)(?::(\d+|\*))?\/?$/.exec(value);
  if (!match) return false;
  const [, scheme, wildcard, host, port] = match;
  if (scheme && `${scheme}:` !== origin.protocol) return false;
  if (port && port !== "*" && port !== (origin.port || (origin.protocol === "https:" ? "443" : "80"))) {
    return false;
  }
  return wildcard
    ? origin.hostname.endsWith(`.${host}`)
    : origin.hostname === host;
};

/**
 * The verdict for one response's headers. CSP frame-ancestors wins over
 * X-Frame-Options (that's how browsers resolve both being present).
 */
export const framePolicyFromHeaders = (
  headers: { get(name: string): string | null },
  hubOrigin: string
): Exclude<FramePolicy, "unreachable"> => {
  const origin = new URL(hubOrigin);

  const csp = headers.get("content-security-policy");
  const directive = csp
    ?.split(/[;,]/)
    .map((part) => part.trim())
    .find((part) => /^frame-ancestors\b/i.test(part));
  if (directive) {
    const sources = directive.split(/\s+/).slice(1);
    return sources.some((source) => sourceAllows(source, origin))
      ? "frameable"
      : "blocked";
  }

  const xfo = headers.get("x-frame-options")?.trim().toUpperCase();
  if (xfo === "DENY" || xfo === "SAMEORIGIN") return "blocked";
  return "frameable";
};

const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { value: FramePolicy; expiresAt: number }>();

/** Fetches `url` (redirects followed) and reads its framing headers. Cached 30 min. */
export const fetchFramePolicy = async (
  url: string,
  hubOrigin: string
): Promise<FramePolicy> => {
  const key = `${hubOrigin} ${url}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  let value: FramePolicy;
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      headers: { "user-agent": "ClientHub-Preview/1.0" },
    });
    // Only the headers matter; don't download the page.
    await res.body?.cancel().catch(() => {});
    value = res.ok ? framePolicyFromHeaders(res.headers, hubOrigin) : "unreachable";
  } catch {
    value = "unreachable";
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
};
