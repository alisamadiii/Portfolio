import path from "path";

const HUB = "https://app.alisamadii.com";
const PORTAL_HOST = [{ type: "host", value: "portal.alisamadii.com" }];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-hosted (Docker/Coolify) deploys use the standalone server bundle;
  // Vercel ignores these two fields. Tracing root = monorepo root so
  // workspace deps land in the bundle.
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
  transpilePackages: [
    "@workspace/ui",
    "@workspace/auth",
    "@workspace/cms-core",
    "@workspace/drizzle",
    "@workspace/trpc",
    "@workspace/email",
    "@workspace/email-editor",
  ],
  async redirects() {
    // portal.alisamadii.com now points at this project; old portal routes map
    // onto their hub equivalents. Query strings (redirectUrl, checkout_id,
    // session_id) are preserved automatically. Temporary (307) until the
    // transition settles — old emails and cached 308s link here indefinitely.
    return [
      { source: "/login", has: PORTAL_HOST, destination: `${HUB}/sign-in`, permanent: false },
      { source: "/signup", has: PORTAL_HOST, destination: `${HUB}/sign-up`, permanent: false },
      { source: "/reset-password", has: PORTAL_HOST, destination: `${HUB}/reset-password`, permanent: false },
      { source: "/billing", has: PORTAL_HOST, destination: `${HUB}/account/billing?tab=purchases`, permanent: false },
      { source: "/", has: PORTAL_HOST, destination: `${HUB}/account`, permanent: false },
      { source: "/:path*", has: PORTAL_HOST, destination: `${HUB}/:path*`, permanent: false },
      // Workspace (2026-11-19): pages lost their /p/<projectId> prefix. Old
      // project links are normalized here, then app/p/[projectId]/[[...rest]]
      // focuses the workspace and strips the prefix. Account billing moved
      // under /account so the project's /billing keeps its Stripe return URL.
      { source: "/p/:projectId/agency", destination: "/p/:projectId/leads", permanent: false },
      { source: "/p/:projectId/agency/:leadId(\\d+)", destination: "/p/:projectId/leads/:leadId", permanent: false },
      { source: "/p/:projectId/agency/:path*", destination: "/p/:projectId", permanent: false },
      { source: "/p/:projectId/marketing/:path*", destination: "/p/:projectId", permanent: false },
      { source: "/p/:projectId/reports", destination: "/p/:projectId", permanent: false },
      { source: "/p/:projectId/settings/danger", destination: "/p/:projectId/billing", permanent: false },
      { source: "/p/:projectId/settings/:section(billing|domain|speed)", destination: "/p/:projectId/:section", permanent: false },
      { source: "/billing/support", destination: "/account/billing/support", permanent: false },
      {
        source: "/billing",
        has: [{ type: "query", key: "tab", value: "purchases" }],
        destination: "/account/billing?tab=purchases",
        permanent: false,
      },
      // Pages that left the hub (GoHighLevel handles booking / calls /
      // marketing / reports). /agency/:path* is NOT here: /agency/success is
      // the agency checkout landing page.
      ...["/marketing", "/reports", "/origins"].flatMap((source) => [
        { source, destination: "/", permanent: false },
        { source: `${source}/:path*`, destination: "/", permanent: false },
      ]),
    ];
  },
};

export default nextConfig;
