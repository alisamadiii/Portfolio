import { domainToASCII } from "url";

/**
 * Pure hostname/slug rules for upload-project domains, mirrored from
 * content-pilot's src/lib/domain-rules.ts. The pilot re-validates
 * authoritatively on every write, so hub-side validation exists only for
 * fast, friendly errors; small drift is harmless.
 */

export const RESERVED_SLUGS = new Set([
  "www",
  "pilot",
  "api",
  "mail",
  "smtp",
  "mx",
  "ns1",
  "ns2",
  "preview",
  "admin",
  "app",
  "dashboard",
  "site",
  "sites",
  "static",
  "assets",
  "cdn",
  "dev",
  "staging",
  "test",
  "blog",
  "docs",
  "status",
  "support",
  "help",
  "ftp",
  "root",
  "fallback",
]);

export const normalizeHost = (raw: string): string => {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return "";
  const withoutPort = trimmed.replace(/:\d+$/, "");
  const withoutDot = withoutPort.replace(/\.$/, "");
  if (!withoutDot) return "";
  return domainToASCII(withoutDot) || "";
};

const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export const validateSlug = (slug: string): string => {
  const value = slug.trim().toLowerCase();
  if (value.length < 3 || value.length > 63) {
    throw new Error("Name must be 3 to 63 characters.");
  }
  if (!LABEL_RE.test(value)) {
    throw new Error(
      "Name can only contain lowercase letters, numbers and hyphens, and cannot start or end with a hyphen."
    );
  }
  if (/^site-\d+$/.test(value) || RESERVED_SLUGS.has(value)) {
    throw new Error("That name is reserved.");
  }
  if (/^[a-z0-9]{12}$/.test(value)) {
    throw new Error("Pick a name with a hyphen, or a different length.");
  }
  return value;
};

const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;

export const validateCustomHost = (host: string): string => {
  // Local dev only: allow localhost / 127.0.0.1 (optionally with a port) so the
  // custom-domain flow can be tested against a local origin. Never in production.
  const rawHost = host.trim().toLowerCase();
  if (
    process.env.NODE_ENV === "development" &&
    /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(rawHost)
  ) {
    return rawHost;
  }
  const value = normalizeHost(host);
  if (!value) throw new Error("Enter a valid domain.");
  if (value.length > 253) throw new Error("Domain is too long.");
  if (IPV4_RE.test(value) || value.includes(":")) {
    throw new Error("Enter a domain name, not an IP address.");
  }
  const labels = value.split(".");
  if (labels.some((label) => !LABEL_RE.test(label) || label.length > 63)) {
    throw new Error("Enter a valid domain.");
  }
  if (value === "localhost" || value.endsWith(".localhost")) {
    throw new Error("Enter a valid domain.");
  }
  if (labels.length < 3) {
    throw new Error(
      "Root domains are not supported yet. Use a subdomain like www.yourdomain.com and set up a redirect from your root domain at your registrar."
    );
  }
  const base = freeSubdomainBase();
  for (const own of [base, "alisamadii.com"].filter(Boolean)) {
    if (value === own || value.endsWith(`.${own}`)) {
      throw new Error("That domain is not available.");
    }
  }
  return value;
};

/** The wildcard base free subdomains live under (display; pilot is truth). */
export const freeSubdomainBase = (): string =>
  process.env.FREE_SUBDOMAIN_BASE || "alisamadii.dev";
