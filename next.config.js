/** @type {import('next').NextConfig} */

const { withContentlayer } = require("next-contentlayer");

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "ldxedhzbfnmrovkzozxc.supabase.co",
        port: "",
      },
    ],
  },
};

module.exports = withContentlayer(nextConfig);
