import { MetadataRoute } from "next";
import { animations } from "@/animations/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  // Use Vercel production URL if available, otherwise fallback to localhost
  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const baseUrl = vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  const animationRoutes: MetadataRoute.Sitemap = Object.keys(animations).map(
    (slug) => ({
      url: `${baseUrl}/m/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    })
  );

  return [...staticRoutes, ...animationRoutes];
}
