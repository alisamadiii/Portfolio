import path from "path";

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
    "@workspace/drizzle",
    "@workspace/trpc",
    "@workspace/email",
    "@workspace/storage",
  ],
  cacheComponents: true,
  compiler: {
    // Remove all console logs
    // eslint-disable-next-line no-undef
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
