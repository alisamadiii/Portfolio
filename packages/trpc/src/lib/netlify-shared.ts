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

// ─── Who hosts a publish ─────────────────────────────────────────
// Project-scoped: the hub_project row decides, never the caller's account. A
// linked site always deploys with the token it was linked with (the pinned
// user's OAuth, else the agency PAT), whoever publishes. A new site is created
// on the project owner's Netlify when they connected it; otherwise only an
// admin can create it, on the agency account.

export type NetlifyHost = "owner" | "agency";

export type NetlifyPlan =
  | {
      action: "deploy";
      host: NetlifyHost;
      /** Whose Netlify token deploys; null = the agency token. */
      tokenUserId: string | null;
      /** True when the site doesn't exist yet and will be created. */
      createSite: boolean;
    }
  | { action: "needs_netlify" };

export function planNetlifyHost(input: {
  siteExists: boolean;
  /** hub_project.netlifyConnectedUserId; null = agency-owned site. */
  pinnedUserId: string | null;
  /** A project owner with Netlify connected, or null when none has. */
  ownerConnectedUserId: string | null;
  callerIsAdmin: boolean;
}): NetlifyPlan {
  if (input.siteExists) {
    return {
      action: "deploy",
      host: input.pinnedUserId ? "owner" : "agency",
      tokenUserId: input.pinnedUserId,
      createSite: false,
    };
  }
  if (input.ownerConnectedUserId) {
    return {
      action: "deploy",
      host: "owner",
      tokenUserId: input.ownerConnectedUserId,
      createSite: true,
    };
  }
  if (input.callerIsAdmin) {
    return { action: "deploy", host: "agency", tokenUserId: null, createSite: true };
  }
  return { action: "needs_netlify" };
}
