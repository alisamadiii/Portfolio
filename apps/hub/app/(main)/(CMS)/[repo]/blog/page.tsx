"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@workspace/trpc/client";
import {
  ArrowLeft,
  ExternalLink,
  ImageOff,
  NotebookPen,
  Plus,
  UploadCloud,
} from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";

import { repoPath } from "@/lib/paths";
import { useDrafts } from "@/lib/store/drafts";
import {
  entryMetaFromFilename,
  type ManifestCollection,
} from "@/lib/engine/collections";
import { isBlogCollection } from "@/lib/engine/blog-schema";

import { usePublish } from "@/components/publish/publish-context";

/** filename → slug: strip extension and the leading YYYY-MM-DD- date prefix. */
function slugFromName(name: string): string {
  return name
    .replace(/\.(md|mdx|json)$/i, "")
    .replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

type BlogRow = {
  path: string;
  name: string;
  title: string;
  date: string | null;
  excerpt?: string;
  coverImage?: string;
  featured?: boolean;
  slug?: string;
  isDraft: boolean;
  isNew: boolean;
};

/**
 * Dedicated blog manager: lists / previews every post, plus in-progress local
 * drafts, and opens the shared EntrySheet composer (canonical BLOG_SCHEMA) for
 * create and edit. Publish runs through the same repo-wide publish dialog.
 */
export default function BlogManagerPage() {
  const { config } = useConfig();
  const { repo } = useRepo();
  const router = useRouter();
  const trpc = useTRPC();
  const { draftCount, openPublishDialog } = usePublish();

  const owner = config?.owner ?? "";
  const repoName = config?.repo ?? "";
  const branch = config?.branch ?? "";
  const enabled = Boolean(owner && repoName && branch);

  const manifestQuery = useQuery(
    trpc.cms.manifest.get.queryOptions(
      { owner, repo: repoName, branch },
      { enabled, staleTime: 60_000 }
    )
  );

  const baseUrl = manifestQuery.data?.object.baseUrl ?? "";
  const blogCollection = (
    (manifestQuery.data?.object.collections as ManifestCollection[]) ?? []
  ).find((collection) => isBlogCollection(collection));

  const listQuery = useQuery(
    trpc.cms.collections.listV2.queryOptions(
      { owner, repo: repoName, branch, name: blogCollection?.name ?? "" },
      { enabled: enabled && Boolean(blogCollection), staleTime: 30_000 }
    )
  );

  const entries = listQuery.data?.entries ?? [];

  // Per-entry content for the preview cards (cover, excerpt, featured flag).
  const contentQueries = useQueries({
    queries: entries.map((entry) =>
      trpc.cms.entries.getContent.queryOptions(
        { owner, repo: repoName, branch, path: entry.path },
        { enabled, staleTime: 30_000 }
      )
    ),
  });
  const contentByPath = useMemo(() => {
    const map = new Map<string, Record<string, any>>();
    entries.forEach((entry, index) => {
      const data = contentQueries[index]?.data;
      if (data && "contentObject" in data) map.set(entry.path, data.contentObject);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, contentQueries.map((q) => q.dataUpdatedAt).join(",")]);

  const drafts = useDrafts(owner, repoName, branch);

  const rows = useMemo<BlogRow[]>(() => {
    if (!blogCollection) return [];
    const prefix = `${blogCollection.path}/`;
    const draftByPath = new Map(
      drafts
        .filter(([, draft]) => draft.path.startsWith(prefix))
        .map(([, draft]) => [draft.path, draft] as const)
    );

    const out: BlogRow[] = [];
    for (const entry of entries) {
      const meta = entryMetaFromFilename(entry.name);
      const content = contentByPath.get(entry.path) ?? {};
      const draft = draftByPath.get(entry.path);
      const values = (draft?.values as Record<string, any>) ?? content;
      out.push({
        path: entry.path,
        name: entry.name,
        title: draft?.title || values.title || meta.title,
        date: values.date || meta.date,
        excerpt: values.excerpt,
        coverImage: values.coverImage,
        featured: Boolean(values.featured),
        slug: values.slug || slugFromName(entry.name),
        isDraft: Boolean(draft),
        isNew: false,
      });
      draftByPath.delete(entry.path);
    }
    // Drafts with no GitHub file yet — brand-new posts.
    for (const [path, draft] of draftByPath) {
      const name = path.slice(prefix.length);
      const meta = entryMetaFromFilename(name);
      const values = draft.values as Record<string, any>;
      out.push({
        path,
        name,
        title: draft.title || values.title || meta.title,
        date: values.date || meta.date,
        excerpt: values.excerpt,
        coverImage: values.coverImage,
        featured: Boolean(values.featured),
        slug: values.slug || slugFromName(name),
        isDraft: true,
        isNew: true,
      });
    }
    out.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    return out;
  }, [blogCollection, entries, contentByPath, drafts]);

  const previewHref = (row: BlogRow): string | null => {
    if (!baseUrl || row.isNew || !blogCollection?.route) return null;
    return `${baseUrl.replace(/\/$/, "")}${blogCollection.route.replace(
      "{slug}",
      row.slug ?? slugFromName(row.name)
    )}`;
  };

  const resolveCover = (coverImage?: string): string | null => {
    if (!coverImage) return null;
    if (/^https?:\/\//.test(coverImage)) return coverImage;
    if (coverImage.startsWith("/") && baseUrl)
      return `${baseUrl.replace(/\/$/, "")}${coverImage}`;
    return null;
  };

  const blogBase = repoPath(repo, "blog");
  const openNew = () => router.push(`${blogBase}/create`);
  const openEdit = (path: string) =>
    router.push(
      `${blogBase}/edit/${path.split("/").map(encodeURIComponent).join("/")}`
    );

  return (
    <div className="mx-auto max-w-6xl">
      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 shrink-0"
          render={
            <Link href={repoPath(repo)}>
              <ArrowLeft className="size-4" />
              Canvas
            </Link>
          }
        />
        <div className="flex items-center gap-2">
          <NotebookPen className="text-muted-foreground size-5" />
          <h1 className="text-lg font-semibold">Blog</h1>
          {blogCollection && (
            <span className="text-muted-foreground text-sm tabular-nums">
              {rows.length} {rows.length === 1 ? "post" : "posts"}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openPublishDialog}>
            <UploadCloud className="size-4" />
            Publish
            {draftCount > 0 && (
              <span className="bg-muted ml-1 rounded-full px-1.5 text-xs tabular-nums">
                {draftCount}
              </span>
            )}
          </Button>
          {blogCollection && (
            <Button size="sm" onClick={openNew}>
              <Plus className="size-4" />
              Write a blog post
            </Button>
          )}
        </div>
      </div>

      {!blogCollection && !manifestQuery.isLoading ? (
        <Empty className="mt-16 border-0">
          <EmptyHeader>
            <EmptyTitle>No blog configured</EmptyTitle>
            <EmptyDescription>
              Add a collection named &quot;blog&quot; to this repo&apos;s
              cms.json to start publishing posts.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : listQuery.isLoading || manifestQuery.isLoading ? (
        <p className="text-muted-foreground py-16 text-center text-sm">
          Loading posts…
        </p>
      ) : rows.length === 0 ? (
        <Empty className="mt-16 border-0">
          <EmptyHeader>
            <EmptyTitle>No posts yet</EmptyTitle>
            <EmptyDescription>
              Write your first blog post — great for SEO and easy to publish.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const cover = resolveCover(row.coverImage);
            const href = previewHref(row);
            return (
              <div
                key={row.path}
                className="group bg-background flex flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => openEdit(row.path)}
                  className="block text-left"
                >
                  <div className="bg-muted relative aspect-[16/9] w-full overflow-hidden">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt=""
                        className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-muted-foreground flex h-full w-full items-center justify-center">
                        <ImageOff className="size-6" />
                      </div>
                    )}
                    {row.featured && (
                      <Badge className="absolute top-2 left-2">Featured</Badge>
                    )}
                  </div>
                </button>
                <div className="flex flex-1 flex-col p-4">
                  <div className="mb-1 flex items-center gap-2">
                    {row.date && (
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {row.date}
                      </span>
                    )}
                    {row.isDraft && (
                      <Badge variant="secondary">
                        {row.isNew ? "New draft" : "Draft"}
                      </Badge>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit(row.path)}
                    className="text-left"
                  >
                    <h2 className="line-clamp-2 font-semibold">{row.title}</h2>
                  </button>
                  {row.excerpt && (
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                      {row.excerpt}
                    </p>
                  )}
                  <div className="mt-auto flex items-center gap-2 pt-4">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openEdit(row.path)}
                    >
                      Edit
                    </Button>
                    {href && (
                      <Button
                        size="sm"
                        variant="ghost"
                        render={
                          <a href={href} target="_blank" rel="noreferrer">
                            Preview
                            <ExternalLink className="size-3.5" />
                          </a>
                        }
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
