"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  Newspaper,
  Trash2,
  UploadCloud,
} from "@/components/icon";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Spinner } from "@workspace/ui/components/spinner";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { useConfig } from "@/contexts/config-context";

import { PanelError } from "@/components/settings/panel-error";

type BlogList = RouterOutputs["cms"]["blog"]["list"];
type BlogPost = BlogList["posts"][number];

// ─── Panel (in-shell, rendered from Site Settings › Blog) ────────
// Posts live in the hub database, not the repository. Saving only stores
// drafts; the "Publish to site" button fires the repo's blog-sync GitHub
// Action, which mirrors published posts into src/content/blog/ and rebuilds
// the website.

export const BlogPanel = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { config } = useConfig();

  const owner = config?.owner;
  const repo = config?.repo;

  const [editingId, setEditingId] = useState<string | null>(null);

  const listOptions = trpc.cms.blog.list.queryOptions(
    { owner: owner ?? "", repo: repo ?? "" },
    { enabled: !!owner && !!repo }
  );
  const { data, isLoading, error, refetch, isRefetching } =
    useQuery(listOptions);

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: listOptions.queryKey });

  const publishMutation = useMutation(
    trpc.cms.blog.publish.mutationOptions({
      onSuccess: () => {
        void invalidateList();
        toast.success("Sync started — your site rebuilds in ~2 minutes.");
      },
      onError: (error) => toast.error(error.message),
    })
  );

  if (!owner || !repo) return null;

  const editingPost =
    editingId != null
      ? (data?.posts.find((post) => post.id === editingId) ?? null)
      : null;

  const hasUnpublishedChanges =
    !!data?.blogEditedAt &&
    (!data.blogPublishedAt ||
      new Date(data.blogEditedAt) > new Date(data.blogPublishedAt));

  return (
    <div className="mx-auto w-full max-w-screen-md p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-extrabold tracking-tight">Blog</h2>
          <p className="text-muted-foreground mt-1 text-[14px]">
            Write and manage your website&apos;s blog posts.
          </p>
        </div>
        <Button
          className="rounded-full px-5"
          disabled={publishMutation.isPending || !data?.posts.length}
          isLoading={publishMutation.isPending}
          onClick={() => publishMutation.mutate({ owner, repo })}
        >
          <UploadCloud className="size-4" />
          Publish to site
        </Button>
      </div>

      {hasUnpublishedChanges && (
        <div className="border-status-warning/40 bg-status-warning/10 mb-6 rounded-lg border px-4 py-3 text-[13.5px]">
          You have unpublished blog changes. Saving here only stores drafts —
          click <span className="font-semibold">Publish to site</span> to
          update your website.
        </div>
      )}

      {error ? (
        <PanelError
          title="Failed to load blog posts"
          message={error.message}
          onRetry={() => void refetch()}
          retrying={isRefetching}
        />
      ) : isLoading || !data ? (
        <div className="flex justify-center py-24">
          <Spinner className="text-muted-foreground size-6" />
        </div>
      ) : editingPost ? (
        <PostEditor
          key={editingPost.id}
          owner={owner}
          repo={repo}
          post={editingPost}
          onBack={() => setEditingId(null)}
          onChanged={invalidateList}
          onDeleted={() => {
            setEditingId(null);
            void invalidateList();
          }}
        />
      ) : (
        <div className="space-y-6">
          <NewPostForm
            owner={owner}
            repo={repo}
            onCreated={(post) => {
              void invalidateList();
              setEditingId(post.id);
            }}
          />

          {data.posts.length === 0 ? (
            <div className="rounded-lg border border-dashed px-6 py-12 text-center">
              <div className="bg-accent text-accent-foreground mx-auto grid size-12 place-items-center rounded-full">
                <Newspaper className="size-6" />
              </div>
              <h3 className="mt-4 text-[19px] font-extrabold tracking-tight">
                No posts yet
              </h3>
              <p className="text-muted-foreground mx-auto mt-2 max-w-[420px] text-[14.5px]">
                Write your first post above. Posts are saved here as drafts —
                when you&apos;re ready, mark them as published and click
                Publish to site to put them on your website.
              </p>
            </div>
          ) : (
            <div className="bg-card divide-y rounded-lg border">
              {data.posts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  className="hover:bg-muted/40 flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors"
                  onClick={() => setEditingId(post.id)}
                >
                  <div className="bg-muted h-[52px] w-[104px] shrink-0 overflow-hidden rounded-md">
                    {post.heroImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.heroImage}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="from-primary/25 to-primary/5 h-full w-full bg-gradient-to-br" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">
                      {post.title}
                    </p>
                    <p className="text-muted-foreground mt-0.5 truncate text-[11.5px]">
                      /blog/{post.slug} · updated{" "}
                      {new Date(post.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {post.status === "published" ? (
                    <span className="bg-status-success-bg text-status-success shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold">
                      Published
                    </span>
                  ) : (
                    <span className="bg-draft-bg text-draft-fg shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold">
                      Draft
                    </span>
                  )}
                  <ChevronRight className="text-muted-foreground/50 size-4 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── New post ────────────────────────────────────────────────────

const NewPostForm = ({
  owner,
  repo,
  onCreated,
}: {
  owner: string;
  repo: string;
  onCreated: (post: BlogPost) => void;
}) => {
  const trpc = useTRPC();
  const [title, setTitle] = useState("");

  const createMutation = useMutation(
    trpc.cms.blog.create.mutationOptions({
      onSuccess: (post) => {
        setTitle("");
        onCreated(post);
        toast.success("Draft created.");
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const canCreate = title.trim().length > 0 && !createMutation.isPending;

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (canCreate)
          createMutation.mutate({ owner, repo, title: title.trim() });
      }}
    >
      <Input
        value={title}
        placeholder="New post title…"
        onChange={(event) => setTitle(event.target.value)}
        disabled={createMutation.isPending}
      />
      <Button
        type="submit"
        variant="outline"
        className="rounded-full px-5"
        disabled={!canCreate}
        isLoading={createMutation.isPending}
      >
        Create draft
      </Button>
    </form>
  );
};

// ─── Editor ──────────────────────────────────────────────────────

const PostEditor = ({
  owner,
  repo,
  post,
  onBack,
  onChanged,
  onDeleted,
}: {
  owner: string;
  repo: string;
  post: BlogPost;
  onBack: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) => {
  const trpc = useTRPC();
  const [removeOpen, setRemoveOpen] = useState(false);

  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [description, setDescription] = useState(post.description);
  const [keyword, setKeyword] = useState(post.keyword);
  const [heroImage, setHeroImage] = useState(post.heroImage ?? "");
  const [heroImageAlt, setHeroImageAlt] = useState(post.heroImageAlt ?? "");
  const [creditName, setCreditName] = useState(post.heroCredit?.name ?? "");
  const [creditUrl, setCreditUrl] = useState(post.heroCredit?.url ?? "");
  const [creditPexelsUrl, setCreditPexelsUrl] = useState(
    post.heroCredit?.pexelsUrl ?? ""
  );
  const [authorName, setAuthorName] = useState(post.author?.name ?? "");
  const [authorTitle, setAuthorTitle] = useState(post.author?.title ?? "");
  const [authorAvatar, setAuthorAvatar] = useState(post.author?.avatar ?? "");
  const [authorUrl, setAuthorUrl] = useState(post.author?.url ?? "");
  const [tags, setTags] = useState(post.tags.join(", "));
  const [body, setBody] = useState(post.body);
  const [published, setPublished] = useState(post.status === "published");

  const updateMutation = useMutation(
    trpc.cms.blog.update.mutationOptions({
      onSuccess: () => {
        onChanged();
        toast.success("Saved. Publish to site when you're ready.");
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const removeMutation = useMutation(
    trpc.cms.blog.remove.mutationOptions({
      onSuccess: () => {
        setRemoveOpen(false);
        onDeleted();
        toast.success("Post deleted. Publish to site to remove it from your website.");
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const slugChanged = slug !== post.slug;

  const save = () => {
    // Credit needs all three fields to be meaningful; author just a name.
    const heroCredit =
      creditName.trim() && creditUrl.trim() && creditPexelsUrl.trim()
        ? {
            name: creditName.trim(),
            url: creditUrl.trim(),
            pexelsUrl: creditPexelsUrl.trim(),
          }
        : null;
    const author = authorName.trim()
      ? {
          name: authorName.trim(),
          title: authorTitle.trim(),
          avatar: authorAvatar.trim(),
          url: authorUrl.trim(),
        }
      : null;

    updateMutation.mutate({
      owner,
      repo,
      id: post.id,
      title: title.trim(),
      slug: slug.trim(),
      description,
      keyword: keyword.trim(),
      heroImage: heroImage.trim() || null,
      heroImageAlt: heroImageAlt.trim() || null,
      heroCredit,
      author,
      body,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      status: published ? "published" : "draft",
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
          All posts
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => setRemoveOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
          <Button
            size="sm"
            className="rounded-full px-5"
            onClick={save}
            disabled={!title.trim() || !slug.trim() || updateMutation.isPending}
            isLoading={updateMutation.isPending}
          >
            Save
          </Button>
        </div>
      </div>

      <div className="bg-card space-y-4 rounded-lg border p-5">
        <div className="space-y-2">
          <Label htmlFor="post-title">Title</Label>
          <Input
            id="post-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="post-slug">Slug</Label>
          <Input
            id="post-slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
          />
          {slugChanged && post.status === "published" && (
            <p className="text-status-warning text-[13px]">
              Changing the slug of a published post changes its URL — old
              links and search results will stop working.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="post-description">Description</Label>
          <Textarea
            id="post-description"
            value={description}
            rows={2}
            placeholder="Short summary shown in post lists and search results."
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="post-keyword">Target keyword</Label>
          <Input
            id="post-keyword"
            value={keyword}
            placeholder="e.g. amazon ses vs resend"
            onChange={(event) => setKeyword(event.target.value)}
          />
          <p className="text-muted-foreground text-[13px]">
            Put the exact keyword in the title only — the description should
            paraphrase it.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="post-hero">Hero image URL</Label>
            <Input
              id="post-hero"
              value={heroImage}
              placeholder="https://…"
              onChange={(event) => setHeroImage(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="post-hero-alt">Hero image alt text</Label>
            <Input
              id="post-hero-alt"
              value={heroImageAlt}
              onChange={(event) => setHeroImageAlt(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <div>
            <p className="text-[14px] font-semibold">Hero image credit</p>
            <p className="text-muted-foreground text-[13px]">
              Optional — photographer attribution (e.g. Pexels). Saved only
              when all three fields are filled.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="post-credit-name">Name</Label>
              <Input
                id="post-credit-name"
                value={creditName}
                placeholder="cottonbro studio"
                onChange={(event) => setCreditName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-credit-url">Profile URL</Label>
              <Input
                id="post-credit-url"
                value={creditUrl}
                placeholder="https://www.pexels.com/@…"
                onChange={(event) => setCreditUrl(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-credit-photo-url">Photo URL</Label>
              <Input
                id="post-credit-photo-url"
                value={creditPexelsUrl}
                placeholder="https://www.pexels.com/photo/…"
                onChange={(event) => setCreditPexelsUrl(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <div>
            <p className="text-[14px] font-semibold">Author</p>
            <p className="text-muted-foreground text-[13px]">
              Optional — leave the name empty and the site shows no byline.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="post-author-name">Name</Label>
              <Input
                id="post-author-name"
                value={authorName}
                onChange={(event) => setAuthorName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-author-title">Title</Label>
              <Input
                id="post-author-title"
                value={authorTitle}
                placeholder="Web Developer & Founder"
                onChange={(event) => setAuthorTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-author-avatar">Avatar URL</Label>
              <Input
                id="post-author-avatar"
                value={authorAvatar}
                placeholder="https://…"
                onChange={(event) => setAuthorAvatar(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-author-url">Website URL</Label>
              <Input
                id="post-author-url"
                value={authorUrl}
                placeholder="https://…"
                onChange={(event) => setAuthorUrl(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="post-tags">Tags</Label>
          <Input
            id="post-tags"
            value={tags}
            placeholder="seo, web-design"
            onChange={(event) => setTags(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="post-body">Content (Markdown)</Label>
          <Textarea
            id="post-body"
            value={body}
            rows={18}
            className="font-mono text-[13px]"
            placeholder="Write your post in Markdown…"
            onChange={(event) => setBody(event.target.value)}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
          <div>
            <p className="text-[14px] font-semibold">Published</p>
            <p className="text-muted-foreground text-[13px]">
              Draft posts never appear on your website, even after Publish to
              site.
            </p>
            <p className="text-muted-foreground text-[13px]">
              {post.publishedAt
                ? `First published ${new Date(post.publishedAt).toLocaleString()} · `
                : ""}
              Last edited {new Date(post.updatedAt).toLocaleString()}
            </p>
          </div>
          <Switch checked={published} onCheckedChange={setPublished} />
        </div>
      </div>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{post.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The post is removed from the hub. It stays on your website until
              you click Publish to site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                removeMutation.mutate({ owner, repo, id: post.id })
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
