import { TRPCError } from "@trpc/server";
import { and, desc, eq, like, sql, type SQL } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import {
  BLOG_POST_STATUS_VALUES,
  hubBlogPost,
  hubProject,
} from "@workspace/drizzle/schema";

import { cmsProcedure, cmsWriteProcedure, createTRPCRouter } from "../../init";
import { requireFeatureAccess } from "../../lib/cms/feature-access";
import { createOctokitInstance } from "../../lib/cms/octokit";
import { resolveRepoId } from "../../lib/cms/repo-id";
import { slugifyTitle } from "../../lib/cms/slug";
import { toTRPCError } from "../../lib/cms/errors";

/**
 * Blog posts authored in the hub (hub_blog_post) and mirrored into the client
 * repo's src/content/blog/ by that repo's blog-sync GitHub Action. CRUD here
 * only touches the DB; `publish` fires the repository_dispatch that makes the
 * Action fetch the public content API, commit the markdown mirror, and thereby
 * trigger the Vercel deploy.
 */

// Postgres unique_violation — the (repoId, lower(slug)) index.
const UNIQUE_VIOLATION = "23505";

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (error as { code?: string }).code === UNIQUE_VIOLATION;

// Stamped on every CRUD mutation so the Blog tab can show the "unpublished
// changes" banner (blogEditedAt > blogPublishedAt). Deletes stamp it too —
// max(post.updatedAt) could never detect a removed row.
const stampBlogEdited = async (repoId: number) => {
  await db
    .update(hubProject)
    .set({ blogEditedAt: new Date() })
    .where(eq(hubProject.repoId, repoId));
};

// Next free slug for a repo: base, then base-2, base-3, …
const availableSlug = async (repoId: number, base: string): Promise<string> => {
  const rows = await db
    .select({ slug: hubBlogPost.slug })
    .from(hubBlogPost)
    .where(
      and(eq(hubBlogPost.repoId, repoId), like(hubBlogPost.slug, `${base}%`))
    );
  const taken = new Set(rows.map((row) => row.slug.toLowerCase()));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
};

const postFields = {
  id: hubBlogPost.id,
  slug: hubBlogPost.slug,
  title: hubBlogPost.title,
  description: hubBlogPost.description,
  keyword: hubBlogPost.keyword,
  heroImage: hubBlogPost.heroImage,
  heroImageAlt: hubBlogPost.heroImageAlt,
  heroCredit: hubBlogPost.heroCredit,
  author: hubBlogPost.author,
  body: hubBlogPost.body,
  tags: hubBlogPost.tags,
  status: hubBlogPost.status,
  publishedAt: hubBlogPost.publishedAt,
  createdAt: hubBlogPost.createdAt,
  updatedAt: hubBlogPost.updatedAt,
};

export const blogRouter = createTRPCRouter({
  list: cmsProcedure.query(async ({ input }) => {
    const repoId = await resolveRepoId(input.owner, input.repo);
    const [posts, [project]] = await Promise.all([
      db
        .select(postFields)
        .from(hubBlogPost)
        .where(eq(hubBlogPost.repoId, repoId))
        .orderBy(desc(hubBlogPost.updatedAt)),
      db
        .select({
          blogEditedAt: hubProject.blogEditedAt,
          blogPublishedAt: hubProject.blogPublishedAt,
        })
        .from(hubProject)
        .where(eq(hubProject.repoId, repoId))
        .limit(1),
    ]);
    return {
      posts,
      blogEditedAt: project?.blogEditedAt ?? null,
      blogPublishedAt: project?.blogPublishedAt ?? null,
    };
  }),

  get: cmsProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const repoId = await resolveRepoId(input.owner, input.repo);
      const [post] = await db
        .select(postFields)
        .from(hubBlogPost)
        .where(
          and(eq(hubBlogPost.id, input.id), eq(hubBlogPost.repoId, repoId))
        )
        .limit(1);
      if (!post)
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      return post;
    }),

  create: cmsWriteProcedure
    .input(z.object({ title: z.string().trim().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const repoId = await resolveRepoId(input.owner, input.repo);
      const base = slugifyTitle(input.title) || "post";
      const slug = await availableSlug(repoId, base);
      const [post] = await db
        .insert(hubBlogPost)
        .values({
          repoId,
          slug,
          title: input.title,
          createdBy: ctx.user.id,
        })
        .returning(postFields);
      await stampBlogEdited(repoId);
      return post;
    }),

  update: cmsWriteProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().trim().min(1).optional(),
        slug: z
          .string()
          .trim()
          .min(1)
          .regex(
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
            "Slug must be lowercase letters, numbers, and dashes."
          )
          .optional(),
        description: z.string().optional(),
        keyword: z.string().optional(),
        heroImage: z.string().nullable().optional(),
        heroImageAlt: z.string().nullable().optional(),
        heroCredit: z
          .object({
            name: z.string().trim().min(1),
            url: z.string().trim().min(1),
            pexelsUrl: z.string().trim().min(1),
          })
          .nullable()
          .optional(),
        author: z
          .object({
            name: z.string().trim().min(1),
            title: z.string(),
            avatar: z.string(),
            url: z.string(),
          })
          .nullable()
          .optional(),
        body: z.string().optional(),
        tags: z.array(z.string().trim().min(1)).optional(),
        status: z.enum(BLOG_POST_STATUS_VALUES).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const repoId = await resolveRepoId(input.owner, input.repo);
      const scope = and(
        eq(hubBlogPost.id, input.id),
        eq(hubBlogPost.repoId, repoId)
      );

      const changes: {
        [K in keyof typeof hubBlogPost.$inferInsert]?:
          | (typeof hubBlogPost.$inferInsert)[K]
          | SQL;
      } = {
        updatedAt: new Date(),
      };
      if (input.title !== undefined) changes.title = input.title;
      if (input.slug !== undefined) changes.slug = input.slug;
      if (input.description !== undefined)
        changes.description = input.description;
      if (input.keyword !== undefined) changes.keyword = input.keyword;
      if (input.heroImage !== undefined)
        changes.heroImage = input.heroImage || null;
      if (input.heroImageAlt !== undefined)
        changes.heroImageAlt = input.heroImageAlt || null;
      if (input.heroCredit !== undefined)
        changes.heroCredit = input.heroCredit;
      if (input.author !== undefined) changes.author = input.author;
      if (input.body !== undefined) changes.body = input.body;
      if (input.tags !== undefined) changes.tags = input.tags;
      if (input.status !== undefined) {
        changes.status = input.status;
        if (input.status === "published") {
          // First publish stamps the stable publishDate; re-publishing after a
          // draft round-trip keeps the original date.
          changes.publishedAt = sql`coalesce(${hubBlogPost.publishedAt}, now())`;
        }
      }

      let post;
      try {
        [post] = await db
          .update(hubBlogPost)
          .set(changes)
          .where(scope)
          .returning(postFields);
      } catch (error) {
        if (isUniqueViolation(error))
          throw new TRPCError({
            code: "CONFLICT",
            message: `Slug "${input.slug}" is already used by another post.`,
          });
        throw toTRPCError(error);
      }
      if (!post)
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      await stampBlogEdited(repoId);
      return post;
    }),

  remove: cmsWriteProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const repoId = await resolveRepoId(input.owner, input.repo);
      const deleted = await db
        .delete(hubBlogPost)
        .where(
          and(eq(hubBlogPost.id, input.id), eq(hubBlogPost.repoId, repoId))
        )
        .returning({ id: hubBlogPost.id });
      if (deleted.length === 0)
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      await stampBlogEdited(repoId);
      return { id: input.id };
    }),

  // The dedicated "Publish to site" button: fire the client repo's blog-sync
  // Action. The Action fetches the public content API, mirrors
  // src/content/blog/, and its push triggers the Vercel deploy.
  publish: cmsWriteProcedure.mutation(async ({ ctx, input }) => {
    await requireFeatureAccess(ctx.user, "cms", {
      owner: input.owner,
      repo: input.repo,
    });
    const repoId = await resolveRepoId(input.owner, input.repo);
    const octokit = createOctokitInstance(ctx.token);
    try {
      await octokit.rest.repos.createDispatchEvent({
        owner: input.owner,
        repo: input.repo,
        event_type: "blog-sync",
        client_payload: {
          triggeredBy: ctx.user.email,
          at: new Date().toISOString(),
        },
      });
    } catch (error) {
      // 404 here usually means no blog-sync workflow on the default branch.
      if ((error as { status?: number })?.status === 404)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "The blog-sync workflow is missing from this repository's default branch. Run `npx cms-bridge blog` in the repo and push it first.",
        });
      throw toTRPCError(error);
    }
    await db
      .update(hubProject)
      .set({ blogPublishedAt: new Date() })
      .where(eq(hubProject.repoId, repoId));
    return { status: "dispatched" as const };
  }),
});
