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
    ];
  },
};

export default nextConfig;
