import type { hubBlogPost } from "../db/schema.js";

type BlogPostRow = typeof hubBlogPost.$inferSelect;

// Render a hub_blog_post row into an Astro-compatible markdown file. Rendering
// happens here — not in the client repos' sync scripts — so YAML escaping is
// solved once: JSON.stringify, because every JSON string is a valid
// double-quoted YAML scalar (titles with quotes/colons/emoji stay safe).
export function renderBlogMarkdown(post: BlogPostRow): {
  path: string;
  content: string;
} {
  const publishDate = post.publishedAt ?? post.createdAt;
  const lines: string[] = ["---"];
  lines.push(`title: ${JSON.stringify(post.title)}`);
  lines.push(`description: ${JSON.stringify(post.description)}`);
  lines.push(`publishDate: ${JSON.stringify(publishDate.toISOString())}`);
  if (post.updatedAt > publishDate) {
    lines.push(`updatedDate: ${JSON.stringify(post.updatedAt.toISOString())}`);
  }
  if (post.coverImage) {
    lines.push(`coverImage: ${JSON.stringify(post.coverImage)}`);
    if (post.coverImageAlt) {
      lines.push(`coverImageAlt: ${JSON.stringify(post.coverImageAlt)}`);
    }
  }
  lines.push(
    `tags: [${post.tags.map((tag) => JSON.stringify(tag)).join(", ")}]`
  );
  lines.push("---", "");
  return {
    path: `${post.slug}.md`,
    content: lines.join("\n") + post.body.trimEnd() + "\n",
  };
}
