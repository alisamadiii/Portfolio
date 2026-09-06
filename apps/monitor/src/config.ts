export interface HttpTarget {
  name: string;
  url: string;
}

// Public URLs pinged every run — real user-facing uptime, catches broken
// proxy/SSL even when the container itself is "running". Edit freely.
export const HTTP_TARGETS: HttpTarget[] = [
  { name: "Portfolio", url: "https://www.alisamadii.com" },
  { name: "Agency", url: "https://agency.alisamadii.com" },
  { name: "Hub", url: "https://hub.alisamadii.com" },
  { name: "usesend", url: "https://mail.alisamadii.com" },
  { name: "EmpowerHer", url: "https://www.empowerher-initiative.org" },
  { name: "EmpowerHer admin", url: "https://admin.empowerher-initiative.org" },
  { name: "EmpowerHer usesend", url: "https://newsletter.empowerher-initiative.org" },
  { name: "Hazara Oregon", url: "https://www.hazaraoregon.org" },
  { name: "Florida A2Z", url: "https://www.fla2zconstruction.com" },
];

// Coolify resources to skip (by uuid) — parked/intentionally stopped.
export const COOLIFY_EXCLUDED_UUIDS = new Set<string>([
  // dad-portfolio — exited:unhealthy on 2026-09-05, assumed parked on purpose
  "uejrtzyasfzvjy6hyit34lwl",
]);

export const HTTP_TIMEOUT_MS = 10_000;
export const COOLIFY_TIMEOUT_MS = 15_000;

// Alert when SES 24h send quota usage crosses this ratio.
export const SES_QUOTA_ALERT_RATIO = 0.8;
