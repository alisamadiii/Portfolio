import path from "path";
import { withContentCollections } from "@content-collections/next";

const hubUrl =
  // eslint-disable-next-line no-undef
  process.env.NODE_ENV === "development"
    ? "http://localhost:3007"
    : "https://hub.alisamadii.com";

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
      { source: "/login", destination: `${hubUrl}/sign-in`, permanent: true },
      { source: "/signup", destination: `${hubUrl}/sign-up`, permanent: true },
      { source: "/settings", destination: `${hubUrl}/account`, permanent: true },
      { source: "/reset-password", destination: `${hubUrl}/reset-password`, permanent: true },
    ];
  },
};

export default withContentCollections(nextConfig);
