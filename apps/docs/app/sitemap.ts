import { MetadataRoute } from "next";

import { source } from "@/lib/source";

const SITE_URL = "https://docs.alisamadii.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return source.getPages().map((page) => ({
    url: `${SITE_URL}${page.url === "/" ? "" : page.url}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: page.url === "/" ? 1 : 0.7,
  }));
}
