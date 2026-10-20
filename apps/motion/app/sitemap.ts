import { MetadataRoute } from "next";
import { animations } from "@/animations/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  // The site's public URL, or localhost in dev.
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
