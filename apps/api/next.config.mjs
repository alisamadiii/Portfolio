import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-hosted (Docker/Coolify) deploys use the standalone server bundle;
  // Vercel ignores these two fields. Tracing root = monorepo root so
  // workspace deps land in the bundle.
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
  // Client website previews (app/client-websites) need "/<slug>/" kept: relative
  // links in the designs resolve against it. The route redirects itself.
  skipTrailingSlashRedirect: true,
  // Shared tRPC routers use the "use cache" directive.
  cacheComponents: true,
  transpilePackages: [
    "@workspace/ui",
    "@workspace/auth",
    "@workspace/cms-core",
    "@workspace/drizzle",
    "@workspace/trpc",
    "@workspace/email",
    "@workspace/storage",
  ],
  compiler: {
    // Remove all console logs
    // eslint-disable-next-line no-undef
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
