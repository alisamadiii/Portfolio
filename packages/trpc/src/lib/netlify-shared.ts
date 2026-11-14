// ─── Netlify: pure domain helpers (client-safe, unit-tested) ─────

// Public suffixes with two labels, so "shop.co.uk" counts as an apex domain.
const MULTI_PART_SUFFIXES = new Set([
  "co.uk", "org.uk", "me.uk", "ac.uk", "gov.uk", "ltd.uk", "plc.uk",
  "com.au", "net.au", "org.au", "co.nz", "org.nz", "co.za", "com.br",
  "com.mx", "co.jp", "co.in", "co.il", "com.tr", "com.sg", "com.hk",
]);

const HOSTNAME = /^(?=.{1,253}$)(?!-)([a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,63}$/;

/** "https://WWW.Example.com/path" → "www.example.com"; null when invalid. */
export function normalizeDomain(input: string): string | null {
  const host = input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
  return HOSTNAME.test(host) ? host : null;
}

/** True for "example.com" / "example.co.uk", false for "www.example.com". */
export function isApexDomain(domain: string): boolean {
  const labels = domain.split(".");
  const suffix = labels.slice(-2).join(".");
  return labels.length === (MULTI_PART_SUFFIXES.has(suffix) ? 3 : 2);
}

export type DnsRecord = { type: "A" | "CNAME"; name: string; value: string };

// Netlify's load balancer IP for apex domains on external DNS.
export const NETLIFY_APEX_IP = "75.2.60.5";

/** The record to set at the domain's registrar so it points at the site. */
export function dnsRecordFor(domain: string, netlifyHost: string): DnsRecord {
  if (isApexDomain(domain)) return { type: "A", name: "@", value: NETLIFY_APEX_IP };
  const labels = domain.split(".");
  const apexLabels = MULTI_PART_SUFFIXES.has(labels.slice(-2).join(".")) ? 3 : 2;
  return {
    type: "CNAME",
    name: labels.slice(0, labels.length - apexLabels).join("."),
    value: netlifyHost,
  };
}
