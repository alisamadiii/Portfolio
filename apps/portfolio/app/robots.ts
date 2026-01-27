import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // Use Vercel production URL if available, otherwise fallback to localhost
  // VERCEL_PROJECT_PRODUCTION_URL is automatically provided by Vercel (system env var)
  const baseUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/setup/",
          "/ui/",
          "/_next/",
          "/private/",
        ],
      },
      {
        userAgent: "GPTBot",
        disallow: "/",
      },
      {
        userAgent: "ChatGPT-User",
        disallow: "/",
      },
      {
        userAgent: "CCBot",
        disallow: "/",
      },
      {
        userAgent: "anthropic-ai",
        disallow: "/",
      },
      {
        userAgent: "Claude-Web",
        disallow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
