"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Eye, Send, SendHorizontal } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Textarea } from "@workspace/ui/components/textarea";

import { useTRPC } from "@workspace/trpc/client";

import { Editor } from "@/components/ui/editor";
import { apiFetch } from "@/lib/query";

type ComposerProps = {
  campaignId?: string;
  initial?: {
    name: string;
    subject: string;
    editor: "rich" | "html";
    html: string;
  };
};

// Compose or edit a draft campaign. Rich mode uses the shared Tiptap editor
// (same one the CMS uses); HTML mode is a raw textarea for pasted templates.
// The branded shell + unsubscribe footer are added server-side at send time.
export function CampaignComposer({ campaignId, initial }: ComposerProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState(initial?.name ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [mode, setMode] = useState<"rich" | "html">(initial?.editor ?? "rich");
  const [html, setHtml] = useState(initial?.html ?? "");
  const [showPreview, setShowPreview] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const { data: contacts } = useQuery(
    trpc.marketing.contacts.list.queryOptions({ limit: 1 })
  );
  const subscribedCount = contacts?.subscribed ?? 0;

  const invalidateCampaigns = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.marketing.campaigns.list.queryKey(),
    });

  const create = useMutation(
    trpc.marketing.campaigns.create.mutationOptions({
      onSuccess: ({ id }) => {
        invalidateCampaigns();
        toast.success("Draft saved.");
        router.replace(`/marketing/${id}/edit`);
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const update = useMutation(
    trpc.marketing.campaigns.update.mutationOptions({
      onSuccess: () => {
        invalidateCampaigns();
        if (campaignId) {
          queryClient.invalidateQueries({
            queryKey: trpc.marketing.campaigns.get.queryKey({ id: campaignId }),
          });
        }
        toast.success("Draft saved.");
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const isSaving = create.isPending || update.isPending;
  const canSave = name.trim() && subject.trim();

  const saveDraft = async (): Promise<string | null> => {
    if (!canSave) {
      toast.error("Give the campaign a name and a subject first.");
      return null;
    }
    const fields = {
      name: name.trim(),
      subject: subject.trim(),
      editor: mode,
      html,
    };
    if (campaignId) {
      await update.mutateAsync({ id: campaignId, ...fields });
      return campaignId;
    }
    const { id } = await create.mutateAsync(fields);
    return id;
  };

  // Gated actions go through the Next route handlers (the 402 surface) so a
  // missing subscription opens the purchase dialog automatically.
  const sendTest = async () => {
    setIsTesting(true);
    try {
      const id = await saveDraft();
      if (!id) return;
      await apiFetch(`/api/marketing/campaigns/${id}/test`, { method: "POST" });
      toast.success("Test email sent to your account address.");
    } catch (error) {
      if (error instanceof Error && error.message) toast.error(error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const sendCampaign = async () => {
    setIsSending(true);
    try {
      const id = await saveDraft();
      if (!id) return;
      await apiFetch(`/api/marketing/campaigns/${id}/send`, { method: "POST" });
      invalidateCampaigns();
      toast.success("Campaign is sending.");
      router.push(`/marketing/${id}`);
    } catch (error) {
      if (error instanceof Error && error.message) toast.error(error.message);
    } finally {
      setIsSending(false);
      setConfirmSend(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="campaign-name">Campaign name</Label>
          <Input
            id="campaign-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="March newsletter"
          />
          <p className="text-muted-foreground text-xs">
            Internal only — recipients never see this.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="campaign-subject">Subject line</Label>
          <Input
            id="campaign-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What's new this month"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Tabs
            value={mode}
            onValueChange={(v) => {
              if (v === "rich" && mode === "html") {
                // Raw HTML rarely round-trips through the rich editor intact.
                if (
                  !window.confirm(
                    "Switching to the rich editor may simplify custom HTML. Continue?"
                  )
                )
                  return;
              }
              setMode(v as "rich" | "html");
            }}
          >
            <TabsList>
              <TabsTrigger value="rich">Editor</TabsTrigger>
              <TabsTrigger value="html">Raw HTML</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview((p) => !p)}
          >
            <Eye className="size-4" />
            {showPreview ? "Hide preview" : "Preview"}
          </Button>
        </div>

        {mode === "rich" ? (
          <Editor
            value={html}
            onChange={setHtml}
            format="html"
            enableImages={false}
            editorClassName="min-h-72"
          />
        ) : (
          <Textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="<html>…</html> — paste your email HTML"
            className="min-h-72 font-mono text-xs"
          />
        )}
        <p className="text-muted-foreground text-xs">
          Personalize with {"{{first_name}}"}, {"{{last_name}}"} and{" "}
          {"{{email}}"}. The unsubscribe footer is added automatically.
        </p>
      </div>

      {showPreview && (
        <div className="overflow-hidden rounded-lg border">
          <div className="bg-muted/40 border-b px-4 py-2 text-xs font-medium">
            Preview — footer and branding are added when sending
          </div>
          <iframe
            title="Email preview"
            sandbox=""
            srcDoc={html || "<p style='font-family:sans-serif;color:#888;padding:24px;'>Nothing to preview yet.</p>"}
            className="h-96 w-full bg-white"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          disabled={isSaving || !canSave}
          onClick={() => void saveDraft()}
        >
          {isSaving ? "Saving…" : "Save draft"}
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={isTesting || isSaving || !canSave || !html.trim()}
            onClick={() => void sendTest()}
          >
            <SendHorizontal className="size-4" />
            {isTesting ? "Sending test…" : "Send test to me"}
          </Button>
          <Button
            disabled={isSending || isSaving || !canSave || !html.trim()}
            onClick={() => setConfirmSend(true)}
          >
            <Send className="size-4" />
            Send campaign
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmSend} onOpenChange={setConfirmSend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Send to {subscribedCount} subscriber
              {subscribedCount === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{subject.trim() || name.trim()}&rdquo; will be emailed to
              every subscribed contact. This can be paused but sent emails
              can&apos;t be recalled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              disabled={isSending}
              onClick={() => setConfirmSend(false)}
            >
              Cancel
            </Button>
            <Button disabled={isSending} onClick={() => void sendCampaign()}>
              {isSending ? "Starting…" : "Send now"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
