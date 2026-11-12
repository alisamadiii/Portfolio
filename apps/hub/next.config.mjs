import path from "path";

const HUB = "https://hub.alisamadii.com";
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
      { source: "/billing", has: PORTAL_HOST, destination: `${HUB}/billing?tab=purchases`, permanent: false },
      { source: "/", has: PORTAL_HOST, destination: `${HUB}/account`, permanent: false },
      { source: "/:path*", has: PORTAL_HOST, destination: `${HUB}/:path*`, permanent: false },
      // One UI per project (2026-11): the editor moved to /website, leads to
      // /leads, site settings to top-level pages, and booking / calls /
      // marketing / reports left the hub (GoHighLevel). The /website list
      // merged into the Sites page at /.
      { source: "/website", destination: "/", permanent: false },
      { source: "/p/:projectId/agency", destination: "/p/:projectId/leads", permanent: false },
      { source: "/p/:projectId/agency/:leadId(\\d+)", destination: "/p/:projectId/leads/:leadId", permanent: false },
      { source: "/p/:projectId/agency/:path*", destination: "/p/:projectId", permanent: false },
      { source: "/p/:projectId/marketing/:path*", destination: "/p/:projectId", permanent: false },
      { source: "/p/:projectId/reports", destination: "/p/:projectId", permanent: false },
      { source: "/p/:projectId/settings/danger", destination: "/p/:projectId/billing", permanent: false },
      { source: "/p/:projectId/settings/:section(billing|domain|speed)", destination: "/p/:projectId/:section", permanent: false },
      // Agency pages moved inside their project (/p/[projectId]/...). Old
      // bookmarks and emailed links land on the Sites page.
      ...["/agency", "/marketing", "/business-info", "/reports", "/analytics", "/origins", "/newsletter"].flatMap(
        (source) => [
          { source, destination: "/", permanent: false },
          { source: `${source}/:path*`, destination: "/", permanent: false },
        ]
      ),
    ];
  },
};

export default nextConfig;
