"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { Badge } from "@/components/ds/ui/badge";
import { Button } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { Field, Input, Textarea } from "@/components/ds/ui/field";
import { useProject } from "@/hooks/use-project";
import { roleAtLeast } from "@/lib/authz-shared";
import { useRouteProjectId } from "@/hooks/use-repo";
import { handleCmsError } from "@/lib/trpc-errors";

type Post = RouterOutputs["wix"]["blog"]["list"][number];

const ago = (iso: string | null) =>
  iso ? formatDistanceToNow(parseISO(iso), { addSuffix: true }) : "—";

/** The Wix site's blog: every post, live or draft, with edit and delete. */
export function WixBlog() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const role = useProject()?.role ?? null;
  const canEdit = !!role && roleAtLeast(role, "content-editor");
  const posts = useQuery(trpc.wix.blog.list.queryOptions({ projectId }, { retry: false }));
  const [editing, setEditing] = useState<{ id?: string } | null>(null);
  const [deleting, setDeleting] = useState<Post | null>(null);

  const remove = useMutation(
    trpc.wix.blog.remove.mutationOptions({
      onSuccess: () => {
        toast.success("Post moved to the Wix trash.");
        void queryClient.invalidateQueries({ queryKey: trpc.wix.blog.pathKey() });
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't delete the post.")),
    })
  );

  const columns: Column<Post>[] = [
    {
      key: "title",
      header: "Title",
      width: "minmax(220px, 3fr)",
      cell: (p) => <span className="truncate font-medium text-ink">{p.title || "Untitled"}</span>,
    },
    {
      key: "status",
      header: "Status",
      width: "150px",
      cell: (p) =>
        p.status === "published" ? (
          <Badge tone={p.pendingChanges ? "warning" : "success"} dot>
            {p.pendingChanges ? "Unpublished edits" : "Published"}
          </Badge>
        ) : (
          <Badge tone="neutral">Draft</Badge>
        ),
    },
    { key: "views", header: "Views", width: "90px", cell: (p) => p.views ?? "—" },
    { key: "updated", header: "Updated", width: "140px", cell: (p) => ago(p.updatedAt) },
    {
      key: "actions",
      header: "",
      width: "110px",
      align: "end",
      cell: (p) => (
        <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {p.url && (
            <a
              href={p.url}
              target="_blank"
              rel="noreferrer"
              aria-label="View post"
              className="grid size-8 place-items-center rounded-control text-dim hover:bg-canvas hover:text-ink"
            >
              <ExternalLink className="size-4" />
            </a>
          )}
          {canEdit && (
            <button
              type="button"
              aria-label="Delete post"
              onClick={() => setDeleting(p)}
              disabled={remove.isPending}
              className="grid size-8 place-items-center rounded-control text-dim hover:bg-canvas hover:text-ink"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </span>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Blog posts"
        divided
        action={
          canEdit && (
            <Button
              size="sm"
              variant="primary"
              icon={<Plus className="size-4" />}
              onClick={() => setEditing({})}
            >
              New post
            </Button>
          )
        }
      />
      {posts.isPending ? (
        <Skeleton className="m-6 h-[200px]" />
      ) : posts.isError ? (
        <p className="px-6 py-6 text-[13px] text-dim">
          {handleCmsError(posts.error, "Couldn't load the blog.")}
        </p>
      ) : (
        <DataTable
          columns={columns}
          rows={posts.data}
          rowKey={(p) => p.id}
          minWidth={640}
          onRowClick={canEdit ? (p) => setEditing({ id: p.id }) : undefined}
          empty={<p className="px-6 py-8 text-center text-[13px] text-dim">No blog posts yet.</p>}
        />
      )}
      {editing && (
        <PostEditor
          id={editing.id}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void queryClient.invalidateQueries({ queryKey: trpc.wix.blog.pathKey() });
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={<>Delete &ldquo;{deleting?.title || "Untitled"}&rdquo;?</>}
        description={
          deleting?.status === "published"
            ? "It comes off your live blog right away and moves to the Wix trash, where you can restore it."
            : "The draft moves to the Wix trash, where you can restore it."
        }
        confirmLabel="Delete post"
        cancelLabel="Keep it"
        danger
        onConfirm={() => {
          if (deleting)
            remove.mutate({ projectId, id: deleting.id, published: deleting.status === "published" });
        }}
      />
    </Card>
  );
}

function PostEditor({
  id,
  onClose,
  onSaved,
}: {
  id?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const trpc = useTRPC();
  const projectId = useRouteProjectId();
  const post = useQuery(
    trpc.wix.blog.get.queryOptions({ projectId, id: id ?? "" }, { enabled: !!id, retry: false })
  );

  if (id && post.isPending) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Loading post…</DialogTitle>
          </DialogHeader>
          <Skeleton className="h-[320px]" />
        </DialogContent>
      </Dialog>
    );
  }
  if (id && post.isError) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Couldn&apos;t open the post</DialogTitle>
            <DialogDescription>{handleCmsError(post.error, "Wix didn't answer.")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  return <PostForm initial={id ? post.data! : null} onClose={onClose} onSaved={onSaved} />;
}

function PostForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: RouterOutputs["wix"]["blog"]["get"] | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const trpc = useTRPC();
  const projectId = useRouteProjectId();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [markdown, setMarkdown] = useState(initial?.markdown ?? "");
  const [bodyDirty, setBodyDirty] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const bodyEditable = initial ? initial.bodyEditable : true;
  const live = !!initial?.published;

  const save = useMutation(
    trpc.wix.blog.save.mutationOptions({
      onSuccess: (_, vars) => {
        toast.success(vars.publish ? "Published on your Wix blog." : "Draft saved in Wix.");
        onSaved();
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't save the post.")),
    })
  );

  const submit = (publish: boolean) =>
    save.mutate({
      projectId,
      id: initial?.id,
      title: title.trim(),
      excerpt: excerpt.trim(),
      // Only send the body when it changed, so nothing is re-converted.
      markdown: bodyEditable && (bodyDirty || !initial) ? markdown : undefined,
      publish,
    });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit post" : "New post"}</DialogTitle>
          <DialogDescription>
            {live
              ? "This post is live. Saving a draft keeps the live version as it is."
              : "Saved to your Wix blog."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </Field>
          <Field label="Excerpt" optional>
            <Textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </Field>
          {bodyEditable ? (
            <Field label="Post" hint="Markdown: # Heading, **bold**, [link](https://…), - list.">
              <Textarea
                value={markdown}
                onChange={(e) => {
                  setMarkdown(e.target.value);
                  setBodyDirty(true);
                }}
                rows={14}
                maxLength={10000}
                className="font-mono text-[13px]"
              />
            </Field>
          ) : (
            <p className="rounded-control border border-line bg-sidebar px-3 py-2.5 text-[13px] text-dim">
              This post has images, videos or other media, so its text is edited in Wix. You can
              still change the title and excerpt here.
            </p>
          )}
          {initial?.pendingChanges && (
            <p className="text-[13px] text-coral-text">
              This post already has edits in Wix that aren&apos;t live. Publishing makes those live
              too.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Cancel</Button>
          <Button disabled={!title.trim() || save.isPending} onClick={() => submit(false)}>
            Save draft
          </Button>
          <Button
            variant="primary"
            disabled={!title.trim() || save.isPending}
            onClick={() => setConfirmPublish(true)}
          >
            {save.isPending ? "Saving…" : live ? "Update live post" : "Publish"}
          </Button>
        </DialogFooter>
        <ConfirmDialog
          open={confirmPublish}
          onOpenChange={setConfirmPublish}
          title={live ? "Update the live post?" : "Publish this post?"}
          description="It goes live on your Wix blog right away, where visitors can read it."
          confirmLabel={live ? "Update live post" : "Publish"}
          onConfirm={() => submit(true)}
        />
      </DialogContent>
    </Dialog>
  );
}
