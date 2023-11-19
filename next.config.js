/** @type {import('next').NextConfig} */
const { withContentlayer } = require("next-contentlayer");
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ldxedhzbfnmrovkzozxc.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

module.exports = withContentlayer(nextConfig);
