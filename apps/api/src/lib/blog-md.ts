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
  if (post.keyword) {
    lines.push(`keyword: ${JSON.stringify(post.keyword)}`);
  }
  // Full ISO timestamps — the client site decides how much precision to show.
  lines.push(`publishDate: ${JSON.stringify(publishDate.toISOString())}`);
  if (post.updatedAt > publishDate) {
    lines.push(`updatedDate: ${JSON.stringify(post.updatedAt.toISOString())}`);
  }
  if (post.heroImage) {
    lines.push(`heroImage: ${JSON.stringify(post.heroImage)}`);
    if (post.heroImageAlt) {
      lines.push(`heroImageAlt: ${JSON.stringify(post.heroImageAlt)}`);
    }
  }
  if (post.heroCredit) {
    lines.push("heroCredit:");
    lines.push(`  name: ${JSON.stringify(post.heroCredit.name)}`);
    lines.push(`  url: ${JSON.stringify(post.heroCredit.url)}`);
    lines.push(`  pexelsUrl: ${JSON.stringify(post.heroCredit.pexelsUrl)}`);
  }
  if (post.author) {
    lines.push("author:");
    lines.push(`  name: ${JSON.stringify(post.author.name)}`);
    lines.push(`  title: ${JSON.stringify(post.author.title)}`);
    lines.push(`  avatar: ${JSON.stringify(post.author.avatar)}`);
    lines.push(`  url: ${JSON.stringify(post.author.url)}`);
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
