"use client";

import { useState } from "react";
import { useConfig } from "@/contexts/config-context";
import { fieldStatus } from "@alisamadiillc/seo-analysis";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { Editor } from "@/components/ui/editor";
import {
  ArrowLeft,
  ChevronRight,
  Newspaper,
  Trash2,
  UploadCloud,
} from "@/components/icon";
import { PanelError } from "@/components/settings/panel-error";
import { SeoAnalysisPanel } from "@/components/settings/seo-analysis-panel";

type BlogList = RouterOutputs["cms"]["blog"]["list"];
type BlogPost = BlogList["posts"][number];

const splitList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

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
    <div className="w-full p-6">
      {/* Header + publish only on the list view — the editor has its own bar. */}
      {!editingPost && (
        <>
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[22px] font-extrabold tracking-tight">
                Blog
              </h2>
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
              You have unpublished blog changes. Saving here only stores drafts
              — click <span className="font-semibold">Publish to site</span> to
              update your website.
            </div>
          )}
        </>
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
          otherPosts={data.posts
            .filter((post) => post.id !== editingPost.id)
            .map((post) => ({
              title: post.title,
              slug: post.slug,
              keyword: post.keyword,
            }))}
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
                when you&apos;re ready, mark them as published and click Publish
                to site to put them on your website.
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
  otherPosts,
  onBack,
  onChanged,
  onDeleted,
}: {
  owner: string;
  repo: string;
  post: BlogPost;
  otherPosts: { title: string; slug: string; keyword: string }[];
  onBack: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) => {
  const trpc = useTRPC();
  const [removeOpen, setRemoveOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [description, setDescription] = useState(post.description);
  const [keyword, setKeyword] = useState(post.keyword);
  const [synonyms, setSynonyms] = useState(post.synonyms.join(", "));
  const [relatedKeywords, setRelatedKeywords] = useState(
    post.relatedKeywords.join(", ")
  );
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
        toast.success(
          "Post deleted. Publish to site to remove it from your website."
        );
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
      synonyms: splitList(synonyms),
      relatedKeywords: splitList(relatedKeywords),
      heroImage: heroImage.trim() || null,
      heroImageAlt: heroImageAlt.trim() || null,
      heroCredit,
      author,
      body,
      tags: splitList(tags),
      status: published ? "published" : "draft",
    });
  };

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
          All posts
        </Button>
        <span className="text-[13px] font-bold">Edit post</span>
        {published ? (
          <span className="bg-status-success-bg text-status-success rounded-full px-2 py-0.5 text-[10.5px] font-bold">
            Published
          </span>
        ) : (
          <span className="bg-draft-bg text-draft-fg rounded-full px-2 py-0.5 text-[10.5px] font-bold">
            Draft
          </span>
        )}
        <div className="flex-1" />
        <Button
          size="sm"
          onClick={save}
          disabled={!title.trim() || !slug.trim() || updateMutation.isPending}
          isLoading={updateMutation.isPending}
        >
          Save draft
        </Button>
      </div>

      {/* Banner */}
      <div className="relative min-h-[180px] overflow-hidden rounded-xl border">
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImage}
            alt={heroImageAlt}
            className="h-[220px] w-full object-cover"
          />
        ) : (
          <div className="from-primary/30 to-primary/5 h-[220px] w-full bg-gradient-to-br" />
        )}
        <span className="absolute top-3 left-3.5 rounded-md bg-black/30 px-2 py-1 text-[10px] font-bold tracking-wide text-white/90 uppercase">
          Banner · 1600 × 480
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="post-hero" className="text-muted-foreground text-xs">
            Banner image URL
          </Label>
          <Input
            id="post-hero"
            value={heroImage}
            placeholder="https://…"
            onChange={(event) => setHeroImage(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="post-hero-alt"
            className="text-muted-foreground text-xs"
          >
            Banner alt text
          </Label>
          <Input
            id="post-hero-alt"
            value={heroImageAlt}
            onChange={(event) => setHeroImageAlt(event.target.value)}
          />
        </div>
      </div>

      {/* Content + settings */}
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        {/* Left: content */}
        <div className="space-y-4">
          <Input
            aria-label="Post title"
            value={title}
            placeholder="Post title"
            className="!h-11 !text-[17px] font-bold"
            onChange={(event) => setTitle(event.target.value)}
          />
          <div className="space-y-1.5">
            <Label
              htmlFor="post-description"
              className="text-muted-foreground text-xs"
            >
              Description{" "}
              <span className="font-normal">shown on the blog listing</span>
            </Label>
            <Textarea
              id="post-description"
              value={description}
              rows={2}
              placeholder="Short summary shown in post lists and search results."
              onChange={(event) => setDescription(event.target.value)}
            />
            <p
              className={cn(
                "text-[11.5px]",
                {
                  bad: "text-status-danger",
                  ok: "text-status-warning",
                  good: "text-status-success",
                }[fieldStatus.descriptionLength(description)]
              )}
            >
              {description.trim().length} / 120–156 characters
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Body</Label>
            <Editor
              format="markdown"
              value={body}
              onChange={setBody}
              editorClassName="min-h-[320px]"
            />
          </div>
        </div>

        {/* Right: post settings + SEO analysis */}
        <div className="space-y-4">
          <div className="bg-card space-y-4 rounded-lg border p-4">
            <p className="text-[12.5px] font-bold">Post settings</p>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">URL</Label>
              <div className="border-input flex h-8 items-center overflow-hidden rounded-sm border">
                <span className="bg-muted text-muted-foreground border-input flex h-full items-center border-r px-2 font-mono text-[11px]">
                  /blog/
                </span>
                <input
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  className="h-full min-w-0 flex-1 bg-transparent px-2 font-mono text-[11.5px] outline-none"
                />
              </div>
              {slugChanged && post.status === "published" && (
                <p className="text-status-warning text-[11.5px]">
                  Changing a published post&apos;s slug changes its URL — old
                  links stop working.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="post-author-name"
                className="text-muted-foreground text-xs"
              >
                Author
              </Label>
              <Input
                id="post-author-name"
                value={authorName}
                onChange={(event) => setAuthorName(event.target.value)}
              />
            </div>

            <div className="flex items-start justify-between gap-3 border-t pt-3">
              <div>
                <p className="text-[13px] font-semibold">Published</p>
                <p className="text-muted-foreground text-[11px]">
                  Draft posts never appear on your website.
                </p>
              </div>
              <Switch checked={published} onCheckedChange={setPublished} />
            </div>

            <p className="text-muted-foreground border-t pt-3 text-[11px] leading-relaxed">
              Saving keeps this post as a draft on this device. It goes live
              when you Publish to site.
            </p>

            {/* Advanced */}
            <button
              type="button"
              onClick={() => setShowAdvanced((open) => !open)}
              className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 border-t pt-3 text-[12px] font-semibold"
            >
              <ChevronRight
                className={cn(
                  "size-3.5 transition-transform",
                  showAdvanced && "rotate-90"
                )}
              />
              Advanced
            </button>
            {showAdvanced && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="post-keyword"
                    className="text-muted-foreground text-xs"
                  >
                    Target keyword
                  </Label>
                  <Input
                    id="post-keyword"
                    value={keyword}
                    placeholder="e.g. amazon ses vs resend"
                    onChange={(event) => setKeyword(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="post-synonyms"
                    className="text-muted-foreground text-xs"
                  >
                    Keyword synonyms
                  </Label>
                  <Input
                    id="post-synonyms"
                    value={synonyms}
                    placeholder="ses vs resend, amazon ses comparison"
                    onChange={(event) => setSynonyms(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="post-related-keywords"
                    className="text-muted-foreground text-xs"
                  >
                    Related keywords
                  </Label>
                  <Input
                    id="post-related-keywords"
                    value={relatedKeywords}
                    placeholder="email deliverability, smtp pricing"
                    onChange={(event) => setRelatedKeywords(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="post-tags"
                    className="text-muted-foreground text-xs"
                  >
                    Tags
                  </Label>
                  <Input
                    id="post-tags"
                    value={tags}
                    placeholder="seo, web-design"
                    onChange={(event) => setTags(event.target.value)}
                  />
                </div>
                <div className="space-y-2 border-t pt-3">
                  <p className="text-[12px] font-semibold">Hero image credit</p>
                  <Input
                    value={creditName}
                    placeholder="Credit name (e.g. cottonbro studio)"
                    onChange={(event) => setCreditName(event.target.value)}
                  />
                  <Input
                    value={creditUrl}
                    placeholder="Profile URL"
                    onChange={(event) => setCreditUrl(event.target.value)}
                  />
                  <Input
                    value={creditPexelsUrl}
                    placeholder="Photo URL"
                    onChange={(event) => setCreditPexelsUrl(event.target.value)}
                  />
                </div>
                <div className="space-y-2 border-t pt-3">
                  <p className="text-[12px] font-semibold">Author details</p>
                  <Input
                    value={authorTitle}
                    placeholder="Title (e.g. Founder)"
                    onChange={(event) => setAuthorTitle(event.target.value)}
                  />
                  <Input
                    value={authorAvatar}
                    placeholder="Avatar URL"
                    onChange={(event) => setAuthorAvatar(event.target.value)}
                  />
                  <Input
                    value={authorUrl}
                    placeholder="Website URL"
                    onChange={(event) => setAuthorUrl(event.target.value)}
                  />
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="text-destructive w-full border-t"
              onClick={() => setRemoveOpen(true)}
            >
              <Trash2 className="size-4" />
              Delete post
            </Button>
          </div>

          <SeoAnalysisPanel
            title={title}
            slug={slug}
            description={description}
            keyword={keyword}
            synonyms={splitList(synonyms)}
            relatedKeywords={splitList(relatedKeywords)}
            body={body}
            heroImage={heroImage}
            heroImageAlt={heroImageAlt}
            otherKeywords={otherPosts
              .map((other) => other.keyword)
              .filter(Boolean)}
            otherPosts={otherPosts}
          />
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
