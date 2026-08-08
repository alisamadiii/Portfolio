import { MetadataRoute } from "next";

// Client Hub is an authenticated app — keep it out of search indexes.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: "/",
      },
    ],
  };
}
