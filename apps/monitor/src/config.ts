export interface HttpTarget {
  name: string;
  url: string;
  /**
   * Coolify resource behind this URL. When set and the HTTP check opens an
   * incident, the worker auto-restarts the resource (src/heal.ts) — covers the
   * "Coolify says running but the site hangs" failure a manual restart fixes.
   * Requires COOLIFY_API_TOKEN with the `deploy` permission.
   */
  coolify?: { type: "applications" | "services"; uuid: string };
}

// Public URLs pinged every run — real user-facing uptime, catches broken
// proxy/SSL even when the container itself is "running". Edit freely.
export const HTTP_TARGETS: HttpTarget[] = [
  { name: "Portfolio", url: "https://www.alisamadii.com", coolify: { type: "applications", uuid: "g6e8t75qv59bjerrnltwv5dq" } },
  { name: "Agency", url: "https://agency.alisamadii.com", coolify: { type: "applications", uuid: "ikgth6bdvnycrlqtgh1enyga" } },
  { name: "Hub", url: "https://hub.alisamadii.com", coolify: { type: "applications", uuid: "i7xogvxrr78uwpsinysnmkag" } },
  { name: "usesend", url: "https://mail.alisamadii.com", coolify: { type: "services", uuid: "19mzkqnmdibuozcfznsc9z66" } },
  { name: "EmpowerHer", url: "https://www.empowerher-initiative.org", coolify: { type: "applications", uuid: "j45skvsiimhm0uym35jshwwr" } },
  { name: "EmpowerHer admin", url: "https://admin.empowerher-initiative.org", coolify: { type: "applications", uuid: "opkslucsxlwgshb4p8rv6f32" } },
  { name: "EmpowerHer usesend", url: "https://newsletter.empowerher-initiative.org", coolify: { type: "services", uuid: "drjr4oz2d6kb4kk9uqsvqetu" } },
  { name: "Hazara Oregon", url: "https://www.hazaraoregon.org", coolify: { type: "applications", uuid: "vy4qftmhl4bchlqtrsii37xn" } },
  { name: "Florida A2Z", url: "https://www.fla2zconstruction.com", coolify: { type: "applications", uuid: "ljwxkm2194xux2xxgmqopv6d" } },
];

// At most one auto-restart per resource per this window — a crash-looping app
// gets one restart attempt, then alerts stay open for a human.
export const RESTART_COOLDOWN_SECONDS = 3600;

export const COOLIFY_BASE = "https://coolify.alisamadii.com";

// Direct dashboard links per resource uuid, so alerts land you on the exact
// resource page. Resolved from /api/v1/projects + /resources on 2026-09-05;
// add new resources here (project uuid / environment uuid / type / uuid).
const P = {
  portfolio: "3axmguke5qpawt5zgpnkysqk/environment/1pxu1zreoicpbdteo0etgoue",
  openSource: "p5ucqak6uoelo6ibnos48vkt/environment/v1eyr0k7cbnplypxsng5gyhy",
  empowerher: "zdsfnawwlw2ivonyztrouvkw/environment/jiqifumukvitrlb8coc44q4r",
  hazara: "lvbia28c1r053tx3r5llvjzy/environment/tqivqnfbbxudpjfg3xp1mfwe",
  fla2z: "emfcic84o6d3gjdxosnq6eod/environment/sg8k4p9yyjobfdcf8wbnqhbq",
  family: "ngfd75qounmfv1vwba0yrfne/environment/nqyzxr00cdshxn7vz706xpcx",
};

export const COOLIFY_DASHBOARD_LINKS: Record<string, string> = {
  ctk6fkd62v84z4mrtgbmntgh: `${COOLIFY_BASE}/project/${P.portfolio}/application/ctk6fkd62v84z4mrtgbmntgh`, // shopify-headless
  g6e8t75qv59bjerrnltwv5dq: `${COOLIFY_BASE}/project/${P.portfolio}/application/g6e8t75qv59bjerrnltwv5dq`, // Portfolio
  ikgth6bdvnycrlqtgh1enyga: `${COOLIFY_BASE}/project/${P.portfolio}/application/ikgth6bdvnycrlqtgh1enyga`, // Agency
  bs6v0orhudeia6ttpm4nx3kd: `${COOLIFY_BASE}/project/${P.portfolio}/application/bs6v0orhudeia6ttpm4nx3kd`, // astro-cms
  i7xogvxrr78uwpsinysnmkag: `${COOLIFY_BASE}/project/${P.portfolio}/application/i7xogvxrr78uwpsinysnmkag`, // Hub
  j45skvsiimhm0uym35jshwwr: `${COOLIFY_BASE}/project/${P.empowerher}/application/j45skvsiimhm0uym35jshwwr`, // EmpowerHer marketing
  opkslucsxlwgshb4p8rv6f32: `${COOLIFY_BASE}/project/${P.empowerher}/application/opkslucsxlwgshb4p8rv6f32`, // EmpowerHer admin
  vy4qftmhl4bchlqtrsii37xn: `${COOLIFY_BASE}/project/${P.hazara}/application/vy4qftmhl4bchlqtrsii37xn`, // Hazara marketing
  ljwxkm2194xux2xxgmqopv6d: `${COOLIFY_BASE}/project/${P.fla2z}/application/ljwxkm2194xux2xxgmqopv6d`, // Florida A2Z
  uejrtzyasfzvjy6hyit34lwl: `${COOLIFY_BASE}/project/${P.family}/application/uejrtzyasfzvjy6hyit34lwl`, // dad-portfolio
  r2kur4i4z1pes0mzy3gjcf1n: `${COOLIFY_BASE}/project/${P.openSource}/service/r2kur4i4z1pes0mzy3gjcf1n`, // wallos
  "19mzkqnmdibuozcfznsc9z66": `${COOLIFY_BASE}/project/${P.openSource}/service/19mzkqnmdibuozcfznsc9z66`, // usesend
  "1rancjve7xk4iq9twnm4wus7": `${COOLIFY_BASE}/project/${P.openSource}/service/1rancjve7xk4iq9twnm4wus7`, // twenty
  drjr4oz2d6kb4kk9uqsvqetu: `${COOLIFY_BASE}/project/${P.empowerher}/service/drjr4oz2d6kb4kk9uqsvqetu`, // EmpowerHer usesend
};

export function dashboardLink(uuid: string): string {
  return COOLIFY_DASHBOARD_LINKS[uuid] ?? COOLIFY_BASE;
}

// Coolify resources to skip (by uuid) — parked/intentionally stopped.
export const COOLIFY_EXCLUDED_UUIDS = new Set<string>([
  // dad-portfolio — exited:unhealthy on 2026-09-05, assumed parked on purpose
  "uejrtzyasfzvjy6hyit34lwl",
]);

export const HTTP_TIMEOUT_MS = 10_000;
export const COOLIFY_TIMEOUT_MS = 15_000;

// Alert when SES 24h send quota usage crosses this ratio.
export const SES_QUOTA_ALERT_RATIO = 0.8;
