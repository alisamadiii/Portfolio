// Pure Newsletter helpers shared by the server router and the hub (no db, no
// network), so they're unit-testable from the hub's vitest.

const HOSTNAME =
  /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/**
 * Normalizes what a client types as their sending domain ("https://Mail.Acme.com/")
 * to a bare hostname, or null when it isn't one.
 */
export function normalizeDomain(input: string): string | null {
  const host = input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/\.$/, "");
  return HOSTNAME.test(host) ? host : null;
}

const LOCAL_PART = /^[a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9])?$/i;

/**
 * Builds the campaign "from" header for the project's own domain. The local
 * part is validated and the domain always comes from the server, so a client
 * can never send as another domain (or inject extra addresses).
 */
export function buildFrom(
  fromName: string,
  localPart: string,
  domain: string
): string {
  const local = localPart.trim().toLowerCase();
  if (!LOCAL_PART.test(local) || local.includes("..")) {
    throw new Error("Use letters, numbers, dots or dashes before the @.");
  }
  const name = fromName.replace(/[<>"\\\r\n,;]/g, "").trim().slice(0, 80);
  const address = `${local}@${domain}`;
  return name ? `${name} <${address}>` : address;
}

/** Splits a stored "Name <local@domain>" back into its editable parts. */
export function parseFrom(from: string): { fromName: string; localPart: string; domain: string } {
  const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  const address = (match ? match[2] : from).trim();
  const [localPart = "", domain = ""] = address.split("@");
  return { fromName: match ? match[1]!.replace(/^"|"$/g, "") : "", localPart, domain };
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Percentage with one decimal, or null when there's nothing to divide by. */
export function rate(part: number, total: number): number | null {
  if (!total) return null;
  return Math.round((part / total) * 1000) / 10;
}

/** The useSend editor requires this placeholder in every campaign. */
export const UNSUBSCRIBE_PLACEHOLDER = "{{usesend_unsubscribe_url}}";

export const CONTACT_IMPORT_CHUNK = 1000;
