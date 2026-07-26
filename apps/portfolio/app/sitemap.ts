import { MetadataRoute } from "next";
import { allPosts } from "content-collections";

import { clientProjects } from "@/lib/clients";

export default function sitemap(): MetadataRoute.Sitemap {
  // Use Vercel production URL if available, otherwise fallback to localhost
  const baseUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || "http://localhost:3000";

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `https://motion.alisamadii.com/`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `https://portal.alisamadii.com/signup`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  // Dynamic routes from posts
  const postRoutes: MetadataRoute.Sitemap = allPosts.map((post) => ({
    url: `${baseUrl}/blog/${post._meta.path}`,
    lastModified: new Date(post.date),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Dynamic routes from client pages
  const clientRoutes: MetadataRoute.Sitemap = clientProjects.map((client) => ({
    url: `${baseUrl}/client/${client.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...postRoutes, ...clientRoutes];
}
