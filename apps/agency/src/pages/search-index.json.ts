import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

import { cities } from "../data/cities";
import { PROJECTS } from "../data/projects";
import { SEARCH_PAGES } from "../data/search-pages";
import { services } from "../data/services";

// Prerendered site-search index consumed by SearchPalette.astro. Blog posts,
// services, and projects are pulled from their data sources at build time,
// so new content is searchable on the next deploy with no manual edits.

export interface SearchDoc {
  id: string;
  type: "page" | "service" | "project" | "blog" | "location";
  title: string;
  description: string;
  url: string;
  image?: string;
  external?: boolean;
  keywords: string[];
}

const trim = (s: string, max = 140) =>
  s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;

export const GET: APIRoute = async () => {
  const posts = (await getCollection("blog", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime()
  );

  const docs: SearchDoc[] = [
    ...SEARCH_PAGES.map((p): SearchDoc => ({
      id: `page:${p.url}`,
      type: "page",
      title: p.title,
      description: trim(p.description),
      url: p.url,
      keywords: p.keywords,
    })),
    ...services.map((s): SearchDoc => ({
      id: `service:${s.slug}`,
      type: "service",
      title: s.name,
      description: trim(s.heroSub),
      url: `/services/${s.slug}`,
      image: s.image.src,
      keywords: [s.keyword, s.eyebrow, ...(s.searchKeywords ?? [])],
    })),
    ...PROJECTS.map((p): SearchDoc => ({
      id: `project:${p.slug}`,
      type: "project",
      title: p.name,
      description: trim(`${p.category} — ${p.description}`),
      url: p.url,
      image: p.image?.src,
      external: true,
      keywords: [
        "project",
        "work",
        "portfolio",
        ...p.category.split("·").map((c) => c.trim()),
      ],
    })),
    ...cities.map((c): SearchDoc => ({
      id: `location:${c.slug}`,
      type: "location",
      title: `${c.name}, FL`,
      description: trim(c.heroSub),
      url: `/locations/${c.slug}`,
      keywords: [
        c.name.toLowerCase(),
        c.county.toLowerCase(),
        "florida",
        ...(c.searchKeywords ?? []),
      ],
    })),
    ...posts.map((p): SearchDoc => ({
      id: `blog:${p.id}`,
      type: "blog",
      title: p.data.title,
      description: trim(p.data.description),
      url: `/blog/${p.id}`,
      image: p.data.heroImage,
      keywords: [p.data.keyword, ...p.data.tags],
    })),
  ];

  return new Response(JSON.stringify(docs), {
    headers: { "Content-Type": "application/json" },
  });
};
