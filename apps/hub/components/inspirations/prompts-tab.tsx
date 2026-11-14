"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, MessageSquareText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import type { InspirationPrompt } from "@workspace/trpc/lib/inspiration-shared";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import { Button, IconButton } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { Field, Input, Textarea } from "@/components/ds/ui/field";
import { EmptyState } from "@/components/ds/ui/misc";
import { handleCmsError } from "@/lib/trpc-errors";

/** Saved prompts (inspiration/_prompts.json): cards with Copy, edit and delete. */
export function PromptsTab({ q, onSearch }: { q: string; onSearch: (value: string) => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const prompts = useQuery(trpc.inspiration.prompts.queryOptions());
  const [editing, setEditing] = useState<InspirationPrompt | "new" | null>(null);
  const [removing, setRemoving] = useState<InspirationPrompt | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.inspiration.prompts.queryKey() });
  const remove = useMutation(
    trpc.inspiration.deletePrompt.mutationOptions({
      onSuccess: () => {
        toast.success("Prompt deleted.");
        void invalidate();
      },
      onError: (e) => toast.error(handleCmsError(e, "Couldn't delete the prompt.")),
    })
  );

  const needle = q.trim().toLowerCase();
  const shown = (prompts.data ?? []).filter(
    (p) => !needle || `${p.title}\n${p.body}`.toLowerCase().includes(needle)
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-9 w-[240px] max-w-full items-center gap-2 rounded-control border border-line-strong bg-surface px-3 text-dim">
          <Search className="size-4" aria-hidden />
          <input
            type="search"
            aria-label="Filter prompts"
            placeholder="Filter prompts"
            value={q}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
          />
        </label>
        <div className="flex-1" />
        <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>
          New prompt
        </Button>
      </div>

      {prompts.isPending && <div className="h-[140px] animate-pulse rounded-card border border-line bg-surface" />}
      {prompts.isError && (
        <Card>
          <EmptyState icon={<MessageSquareText className="size-5" />} title="Couldn't load prompts" text={prompts.error.message} />
        </Card>
      )}
      {prompts.data?.length === 0 && (
        <Card>
          <EmptyState
            icon={<MessageSquareText className="size-5" />}
            title="No prompts yet"
            text="Save prompts you reuse for designs and copy them in one click."
          />
        </Card>
      )}
      {prompts.data && prompts.data.length > 0 && shown.length === 0 && (
        <p className="text-[13px] text-dim">No prompts match &ldquo;{q}&rdquo;.</p>
      )}

      <div className="grid items-start gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
        {shown.map((prompt) => (
          <Card key={prompt.id} className="flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold leading-snug">{prompt.title}</h3>
              <div className="flex shrink-0 gap-0.5">
                <IconButton aria-label="Edit prompt" className="size-8" onClick={() => setEditing(prompt)}>
                  <Pencil className="size-3.5" />
                </IconButton>
                <IconButton aria-label="Delete prompt" className="size-8 text-danger" onClick={() => setRemoving(prompt)}>
                  <Trash2 className="size-3.5" />
                </IconButton>
              </div>
            </div>
            <p className="line-clamp-6 whitespace-pre-wrap text-[13px] leading-relaxed text-dim">{prompt.body}</p>
            <Button
              size="sm"
              icon={<Copy className="size-3.5" />}
              className="self-start"
              onClick={async () => {
                await navigator.clipboard.writeText(prompt.body);
                toast.success("Prompt copied.");
              }}
            >
              Copy
            </Button>
          </Card>
        ))}
      </div>

      {editing && (
        <PromptDialog
          prompt={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => void invalidate()}
        />
      )}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        danger
        title={`Delete ${removing?.title ?? "prompt"}?`}
        description="It can't be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (removing) remove.mutate({ id: removing.id });
          setRemoving(null);
        }}
      />
    </>
  );
}

function PromptDialog({
  prompt,
  onClose,
  onSaved,
}: {
  prompt: InspirationPrompt | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const trpc = useTRPC();
  const [title, setTitle] = useState(prompt?.title ?? "");
  const [body, setBody] = useState(prompt?.body ?? "");
  const options = {
    onSuccess: () => {
      toast.success("Prompt saved.");
      onSaved();
      onClose();
    },
    onError: (e: Parameters<typeof handleCmsError>[0]) => toast.error(handleCmsError(e, "Couldn't save the prompt.")),
  };
  const create = useMutation(trpc.inspiration.createPrompt.mutationOptions(options));
  const update = useMutation(trpc.inspiration.updatePrompt.mutationOptions(options));
  const pending = create.isPending || update.isPending;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{prompt ? "Edit prompt" : "New prompt"}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fields = { title: title.trim(), body: body.trim() };
            if (prompt) update.mutate({ id: prompt.id, ...fields });
            else create.mutate(fields);
          }}
        >
          <Field label="Title">
            <Input autoFocus value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Prompt">
            <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={!title.trim() || !body.trim() || pending}>
              Save prompt
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
