import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // Primary keyword the post targets (used in schema serviceType-style hints).
    keyword: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string(),
    heroImageAlt: z.string(),
    heroCredit: z
      .object({ name: z.string(), url: z.string(), pexelsUrl: z.string() })
      .optional(),
    tags: z.array(z.string()).default([]),
    // Author byline shown under the post description; url links to the
    // author's portfolio.
    author: z.object({
      name: z.string(),
      title: z.string(),
      avatar: z.string(),
      url: z.string(),
    }),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
