/** @type {import('next').NextConfig} */
const { withContentlayer } = require("next-contentlayer");
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ldxedhzbfnmrovkzozxc.supabase.co",
      },
    ],
  },
};

module.exports = withContentlayer(nextConfig);
