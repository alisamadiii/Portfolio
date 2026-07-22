/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@workspace/ui",
    "@workspace/auth",
    "@workspace/drizzle",
    "@workspace/trpc",
    "@workspace/email",
  ],
};

export default nextConfig;
