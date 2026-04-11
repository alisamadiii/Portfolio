import { withContentCollections } from "@content-collections/next";

const portalUrl =
  // eslint-disable-next-line no-undef
  process.env.NODE_ENV === "development"
    ? "http://localhost:3006"
    : "https://portal.alisamadii.com";

/** @type {import('next').NextConfig} */
const nextConfig = {
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
  async redirects() {
    return [
      { source: "/login", destination: `${portalUrl}/login`, permanent: true },
      { source: "/signup", destination: `${portalUrl}/signup`, permanent: true },
      { source: "/settings", destination: `${portalUrl}`, permanent: true },
      { source: "/verify-email", destination: `${portalUrl}/verify-email`, permanent: true },
      { source: "/reset-password", destination: `${portalUrl}/reset-password`, permanent: true },
      { source: "/choose-plan", destination: `${portalUrl}/choose-plan`, permanent: true },
    ];
  },
};

export default withContentCollections(nextConfig);
