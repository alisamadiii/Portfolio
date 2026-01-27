import { createMDX } from "fumadocs-mdx/next";

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
};

const withMDX = createMDX({
  // customise the config file path
  // configPath: "source.config.ts"
});

export default withMDX(nextConfig);
