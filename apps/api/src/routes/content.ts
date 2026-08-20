import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../db/index.js";
import { hubBlogPost } from "../db/schema.js";
import { renderBlogMarkdown } from "../lib/blog-md.js";
import { ApiError } from "../lib/errors.js";
import type { AppEnv } from "../middleware/auth.js";

// Public content for client-site GitHub Actions — the only /v1 router that
// deliberately does NOT apply requireAuth. Published blog posts are already
// public on the site itself, so keying reads by repoId costs nothing to
// expose, and skipping a key means client repos need no Actions secret. The
// global per-IP flood limiter in app.ts still applies. Drafts never leave
// this route.
export const content = new Hono<AppEnv>();

// GET /v1/content/blog?repoId=123 — every published post for a hub project,
// pre-rendered as ready-to-write markdown files. The repo's blog-sync Action
// mirrors `files` into `dir` verbatim (write changed, delete stale).
content.get("/blog", async (c) => {
  const raw = c.req.query("repoId");
  const repoId = Number(raw);
  if (!raw || !Number.isInteger(repoId) || repoId <= 0) {
    throw new ApiError(
      400,
      "INVALID_REPO_ID",
      "repoId must be a positive integer.",
      "Pass the hub project's GitHub-stable repo id, e.g. /v1/content/blog?repoId=123456789."
    );
  }

  const db = createDb(c.env);
  const posts = await db
    .select()
    .from(hubBlogPost)
    .where(
      and(eq(hubBlogPost.repoId, repoId), eq(hubBlogPost.status, "published"))
    )
    .orderBy(desc(hubBlogPost.publishedAt));

  return c.json({
    generatedAt: new Date().toISOString(),
    dir: "src/content/blog",
    files: posts.map(renderBlogMarkdown),
  });
});
