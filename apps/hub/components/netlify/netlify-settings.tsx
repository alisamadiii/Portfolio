"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { Badge } from "@/components/ds/ui/badge";
import { Button, ButtonAnchor } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { Field, Input, Select, Textarea } from "@/components/ds/ui/field";
import { useRouteProjectId } from "@/hooks/use-repo";
import { handleCmsError } from "@/lib/trpc-errors";

type Snippet = RouterOutputs["netlify"]["settings"]["snippets"][number];

/** Netlify site settings the API allows: pretty URLs and code injection. */
export function NetlifySettings({ canEdit }: { canEdit: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const settings = useQuery(trpc.netlify.settings.queryOptions({ projectId }, { retry: false }));
  const [title, setTitle] = useState("");
  const [html, setHtml] = useState("");
  const [position, setPosition] = useState<"head" | "footer">("head");
  const [confirm, setConfirm] = useState<
    { kind: "pretty"; on: boolean } | { kind: "add" } | { kind: "remove"; snippet: Snippet } | null
  >(null);

  const refresh = (message: string) => () => {
    toast.success(message);
    void queryClient.invalidateQueries({ queryKey: trpc.netlify.settings.queryKey({ projectId }) });
  };
  const pretty = useMutation(
    trpc.netlify.setPrettyUrls.mutationOptions({
      onSuccess: refresh("Saved. It applies on the next deploy."),
      onError: (e) => toast.error(handleCmsError(e, "Couldn't save.")),
    })
  );
  const add = useMutation(
    trpc.netlify.addSnippet.mutationOptions({
      onSuccess: () => {
        setTitle("");
        setHtml("");
        refresh("Code added. It applies on the next deploy.")();
      },
      onError: (e) => toast.error(handleCmsError(e, "Couldn't add the code.")),
    })
  );
  const remove = useMutation(
    trpc.netlify.removeSnippet.mutationOptions({
      onSuccess: refresh("Code removed. It applies on the next deploy."),
      onError: (e) => toast.error(handleCmsError(e, "Couldn't remove the code.")),
    })
  );

  if (settings.isPending) return <Skeleton className="h-[320px] rounded-card" />;
  if (settings.isError) {
    return (
      <Card className="px-6 py-6 text-[13px] text-dim">
        {handleCmsError(settings.error, "Couldn't load settings from Netlify.")}
      </Card>
    );
  }
  const s = settings.data;
  const busy = pretty.isPending || add.isPending || remove.isPending;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title="Site settings" divided />
        <div className="flex flex-col divide-y divide-divider text-[14px]">
          <label className="flex items-center justify-between gap-4 px-6 py-4">
            <span className="flex flex-col">
              <span className="text-ink">Pretty URLs</span>
              <span className="text-[13px] text-dim">Serve /about instead of /about.html.</span>
            </span>
            <input
              type="checkbox"
              checked={!!s.prettyUrls}
              disabled={!canEdit || busy}
              onChange={(e) => setConfirm({ kind: "pretty", on: e.target.checked })}
              className="size-4 accent-coral"
            />
          </label>
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <span className="flex flex-col">
              <span className="text-ink">&ldquo;Powered by Netlify&rdquo; badge</span>
              <span className="text-[13px] text-dim">
                {s.ownedByAgency
                  ? "Managed by your agency on this site."
                  : "Netlify only lets you change this in its own dashboard."}
              </span>
            </span>
            {!s.ownedByAgency && (
              <ButtonAnchor size="sm" href={s.badgeUrl} target="_blank" rel="noreferrer" icon={<ExternalLink className="size-3.5" />}>
                Change in Netlify
              </ButtonAnchor>
            )}
          </div>
          <p className="px-6 py-4 text-[13px] text-dim">
            Your site is built by Client Hub, so Netlify build settings like Node version, branches and build
            hooks aren&apos;t used.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Code injection" divided />
        <p className="px-6 pt-4 text-[13px] leading-normal text-dim">
          Add scripts or tags to every page, like analytics or a chat widget. Netlify inserts them when the site is
          deployed.
        </p>
        <div className="flex flex-col gap-2 px-6 py-4">
          {s.snippets.length === 0 && <p className="text-[13px] text-dim">No code added yet.</p>}
          {s.snippets.map((snip) => (
            <div key={snip.id} className="flex items-start justify-between gap-3 rounded-control border border-line px-3 py-2.5">
              <span className="flex min-w-0 flex-col gap-1">
                <span className="flex items-center gap-2 text-[14px] font-medium text-ink">
                  {snip.title}
                  <Badge tone="neutral">{snip.position === "head" ? "Head" : "End of body"}</Badge>
                </span>
                <code className="truncate text-[12px] text-dim">{snip.preview}</code>
              </span>
              {canEdit && (
                <button
                  type="button"
                  aria-label={`Remove ${snip.title}`}
                  disabled={busy}
                  onClick={() => setConfirm({ kind: "remove", snippet: snip })}
                  className="grid size-8 shrink-0 place-items-center rounded-control text-dim hover:bg-canvas hover:text-ink"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {canEdit && (
          <form
            className="flex flex-col gap-3 border-t border-divider px-6 py-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim() && html.trim()) setConfirm({ kind: "add" });
            }}
          >
            <div className="flex flex-wrap gap-3">
              <Field label="Name" className="min-w-[200px] flex-1">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Google Analytics" maxLength={100} />
              </Field>
              <Field label="Where" className="w-[180px]">
                <Select value={position} onChange={(e) => setPosition(e.target.value as "head" | "footer")}>
                  <option value="head">Head</option>
                  <option value="footer">End of body</option>
                </Select>
              </Field>
            </div>
            <Field label="Code">
              <Textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                rows={5}
                maxLength={10000}
                placeholder="<script>…</script>"
                className="font-mono text-[13px]"
              />
            </Field>
            <div>
              <Button type="submit" variant="primary" icon={<Plus className="size-4" />} disabled={!title.trim() || !html.trim() || busy}>
                Add code
              </Button>
            </div>
          </form>
        )}
      </Card>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={
          confirm?.kind === "pretty"
            ? confirm.on
              ? "Turn on pretty URLs?"
              : "Turn off pretty URLs?"
            : confirm?.kind === "add"
              ? `Add “${title.trim()}” to every page?`
              : `Remove “${confirm?.kind === "remove" ? confirm.snippet.title : ""}”?`
        }
        description={
          confirm?.kind === "add"
            ? "This code runs on every page of your live site after the next deploy. Only add code you trust."
            : "It applies on the next deploy. Use Redeploy on the Overview tab to apply it now."
        }
        confirmLabel={confirm?.kind === "remove" ? "Remove" : "Save"}
        danger={confirm?.kind === "remove"}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.kind === "pretty") pretty.mutate({ projectId, on: confirm.on });
          if (confirm.kind === "add") add.mutate({ projectId, title: title.trim(), html: html.trim(), position });
          if (confirm.kind === "remove") remove.mutate({ projectId, id: confirm.snippet.id });
        }}
      />
    </div>
  );
}
