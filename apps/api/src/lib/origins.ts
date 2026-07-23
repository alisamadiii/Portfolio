import { z } from "zod";

// Origin allowlisting for API keys. A stored rule is either a full origin
// ("https://acme.com", "http://localhost:5173") — matched exactly against the
// browser-sent Origin header — or a bare domain ("acme.com") — matched
// against the Origin's hostname with any scheme, any port, and any subdomain
// (so "acme.com" covers https://acme.com, http://acme.com and
// https://www.acme.com).

// Canonical origin: lowercase scheme + host, optional non-default port, no
// path/slash/query/hash/userinfo. `new URL(v).origin === v` enforces all of
// that in one shot.
function isCanonicalOrigin(value: string): boolean {
  try {
    return new URL(value).origin === value;
  } catch {
    return false;
  }
}

// Bare domain: exactly a hostname, nothing else. The regex pins the shape
// (lowercase labels, no "*", no leading/trailing dots or hyphens); the URL
// round-trip additionally rejects anything a browser would normalize away
// (ports, paths, userinfo, IDN).
const DOMAIN_RE =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
function isBareDomain(value: string): boolean {
  if (!DOMAIN_RE.test(value)) return false;
  try {
    return new URL(`http://${value}`).hostname === value;
  } catch {
    return false;
  }
}

export function isValidOriginRule(value: string): boolean {
  return /^https?:\/\//.test(value)
    ? isCanonicalOrigin(value)
    : isBareDomain(value);
}

export const originSchema = z.string().max(255).refine(isValidOriginRule, {
  message:
    'Must be a domain like "acme.com" (matches any scheme/port/subdomain) or a canonical origin like "https://acme.com" or "http://localhost:5173" — lowercase, no path or trailing slash',
});

export function originAllowed(
  origin: string | undefined,
  allowed: readonly string[] | null | undefined
): boolean {
  if (!origin) return false;
  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return false;
  }
  return (allowed ?? []).some((rule) =>
    /^https?:\/\//.test(rule)
      ? rule === origin
      : hostname === rule || hostname.endsWith(`.${rule}`)
  );
}
