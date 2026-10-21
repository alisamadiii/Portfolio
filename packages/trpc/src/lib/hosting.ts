/**
 * Where a project's live website is served (hub_project.hosting).
 *  - content-pilot: every publish builds the site on content-pilot and serves
 *    its dist/ (live URL, free subdomain, custom domain).
 *  - anything else: the site lives on that host. Publish only squashes and
 *    pushes to GitHub, and the host deploys it. No content-pilot build or live
 *    site. GitHub projects only (uploads have no remote for a host to pull).
 */

export const HOSTING_VALUES = [
  "content-pilot",
  "netlify",
  "vercel",
  "cloudflare",
  "other",
] as const;

export type Hosting = (typeof HOSTING_VALUES)[number];

export const HOSTING_LABELS: Record<Hosting, string> = {
  "content-pilot": "Content Pilot",
  netlify: "Netlify",
  vercel: "Vercel",
  cloudflare: "Cloudflare",
  other: "another host",
};

/** Unknown/legacy values fall back to content-pilot hosting. */
export const parseHosting = (value: string | null | undefined): Hosting =>
  (HOSTING_VALUES as readonly string[]).includes(value ?? "")
    ? (value as Hosting)
    : "content-pilot";

export const isExternalHosting = (value: string | null | undefined) =>
  parseHosting(value) !== "content-pilot";

/**
 * A website URL typed by a person ("acme.com", "https://www.acme.com/x") →
 * its https origin, or null when it isn't a usable URL.
 */
export const normalizeWebsiteUrl = (raw: string): string | null => {
  const value = raw.trim();
  if (!value) return null;
  const withProto = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProto);
    if (!url.hostname.includes(".")) return null;
    return url.origin;
  } catch {
    return null;
  }
};
