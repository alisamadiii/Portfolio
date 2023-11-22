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
  webpack: (config) => {
    // ignore formidable warnings
    config.ignoreWarnings = [
      { module: /node_modules\/formidable\/src\/Formidable\.js/ },
      { file: /node_modules\/formidable\/src\/index\.js/ },
    ];

    return config;
  },
};

module.exports = withContentlayer(nextConfig);
