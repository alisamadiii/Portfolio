// Site Monitor: shapes of the sitewatch /api/v1 responses + pure helpers the
// hub page and the router share (no server imports here).

export type SitewatchSite = {
  id: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
  uptimeStatus: "unknown" | "up" | "down";
  pingEveryMinutes: number;
  sslValidTo: string | null;
  domainExpiry: string | null;
  createdAt: string;
};

export type SitewatchUptime = {
  pct24h: number | null;
  pct7d: number | null;
  pct30d: number | null;
  avgResponseMs: number | null;
  /** 48 half-hour slots, oldest first. */
  bar24h: { state: "up" | "down" | "none"; from: number }[];
  /** Hourly average response time (ms epoch hour), 30 days. */
  series: { t: number; ms: number }[];
  upSince: string | null;
  downSince: string | null;
  lastCheckAt: string | null;
  incidents: { id: string; message: string; firstSeenAt: string; resolvedAt: string | null }[];
};

export type SitewatchIncident = {
  id: string;
  checkType: string;
  severity: "error" | "warning";
  message: string;
  pageUrl: string;
  details: Record<string, unknown> | null;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
  ignoredAt: string | null;
};

export type SitewatchRun = {
  id: string;
  status: "running" | "ok" | "degraded" | "failed" | "error";
  startedAt: string;
  finishedAt: string | null;
  pagesChecked: number;
  pagesTotal: number;
  errorCount: number;
  warningCount: number;
};

export type SitewatchPage = { url: string; problems: { errors: number; warnings: number } | null };

export type SitewatchEndpoint = {
  id: string;
  name: string;
  url: string;
  method: string;
  status: "up" | "down" | "pending";
  downReason: string | null;
};

/** Hostname without `www.` (sitewatch matches sites the same way). null = not a URL. */
export const siteHost = (value: string): string | null => {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
};

/** "/blog/post" for a page on the site, the full URL for anything else. */
export const pagePath = (pageUrl: string, baseUrl: string): string => {
  try {
    const page = new URL(pageUrl);
    if (siteHost(page.hostname) !== siteHost(baseUrl)) return pageUrl;
    return `${page.pathname}${page.search}` || "/";
  } catch {
    return pageUrl;
  }
};

const CHECK_LABELS: Record<string, string> = {
  sitemap: "Sitemap",
  http_status: "Broken page",
  image_broken: "Broken image",
  image_not_cdn: "Image not optimized",
  asset_failed: "File failed to load",
  mixed_content: "Insecure content",
  button_dead: "Button not working",
  console_error: "Script error",
  seo: "SEO",
  security_headers: "Security",
  redirect: "Redirect",
  perf: "Speed",
  external_link: "Dead link",
  stale_content: "Outdated content",
  structured_data: "Structured data",
  soft_404: "Missing page",
  ssl_expiry: "SSL certificate",
  domain_expiry: "Domain",
  email_dns: "Email setup",
  form_contact: "Contact form",
  form_quote: "Quote form",
  endpoint: "Endpoint",
  uptime: "Downtime",
  crawl: "Check",
};

/** Plain-English label for a sitewatch check type. */
export const checkTypeLabel = (checkType: string): string =>
  CHECK_LABELS[checkType] ?? checkType.replace(/_/g, " ");

/** One problem as a paste-ready line for an AI assistant. */
const problemLine = (p: SitewatchIncident, baseUrl: string) =>
  `- [${p.severity}] ${p.message} (${p.checkType}, page ${pagePath(p.pageUrl, baseUrl)})${
    p.details ? `\n  details: ${JSON.stringify(p.details)}` : ""
  }`;

/** "Copy for AI": the site plus every given problem, ready to paste into a chat. */
export const problemsForAi = (site: { name: string; baseUrl: string }, problems: SitewatchIncident[]): string =>
  [
    `Website: ${site.name} (${site.baseUrl})`,
    `These problems were found by our site monitor. Explain each one and how to fix it in the website's code.`,
    "",
    ...problems.map((p) => problemLine(p, site.baseUrl)),
  ].join("\n");

/** Uptime percentage as "99.612%", or "—" when there's no data yet. */
export const formatPct = (pct: number | null): string =>
  pct == null ? "—" : `${pct === 100 ? "100" : pct.toFixed(3)}%`;

/** "23d 13h 19m" / "4h 2m" / "3m" for a span in ms (largest three units). */
export const shortDuration = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};
