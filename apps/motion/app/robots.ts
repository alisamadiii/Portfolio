import { MetadataRoute } from "next";

const SITE_URL = "https://motion.alisamadii.com";

export default function robots(): MetadataRoute.Robots {
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
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
