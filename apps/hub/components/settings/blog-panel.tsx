"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Newspaper,
  Trash2,
  UploadCloud,
} from "lucide-react";
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
import { Badge } from "@workspace/ui/components/badge";
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
                  className="hover:bg-muted/40 flex w-full items-center gap-3 px-5 py-4 text-left transition-colors"
                  onClick={() => setEditingId(post.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold">
                      {post.title}
                    </p>
                    <p className="text-muted-foreground mt-0.5 truncate text-[13px]">
                      /{post.slug} · updated{" "}
                      {new Date(post.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      post.status === "published" ? "default" : "secondary"
                    }
                    className="shrink-0"
                  >
                    {post.status === "published" ? "Published" : "Draft"}
                  </Badge>
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
  const [coverImage, setCoverImage] = useState(post.coverImage ?? "");
  const [coverImageAlt, setCoverImageAlt] = useState(post.coverImageAlt ?? "");
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
    updateMutation.mutate({
      owner,
      repo,
      id: post.id,
      title: title.trim(),
      slug: slug.trim(),
      description,
      coverImage: coverImage.trim() || null,
      coverImageAlt: coverImageAlt.trim() || null,
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="post-cover">Cover image URL</Label>
            <Input
              id="post-cover"
              value={coverImage}
              placeholder="https://…"
              onChange={(event) => setCoverImage(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="post-cover-alt">Cover image alt text</Label>
            <Input
              id="post-cover-alt"
              value={coverImageAlt}
              onChange={(event) => setCoverImageAlt(event.target.value)}
            />
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
