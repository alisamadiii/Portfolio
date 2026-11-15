"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import { useTRPC } from "@workspace/trpc/client";

import { Button } from "@/components/ds/ui/button";
import {
  pilotUrl,
  type Picked,
  UploadDropzone,
  uploadZip,
  zipForUpload,
} from "@/components/deploy/upload-dropzone";
import { repoPath } from "@/lib/paths";

/**
 * "Import" inside an uploaded project: replace the whole source with a new
 * folder or zip (any supported stack: Astro, Vite or plain HTML, switching
 * between them is fine). The pilot builds the new tree as one commit on main,
 * so history and the GitHub backup are kept. The live site is NOT redeployed;
 * the toast points at the Netlify page for that.
 */
export function ReplaceSourceDialog({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const tokenMutation = useMutation(trpc.deploy.replaceUploadToken.mutationOptions());
  const finalizeMutation = useMutation(trpc.deploy.finalizeReplace.mutationOptions());

  const pick = useCallback((next: Picked) => setPicked(next), []);

  const reset = () => {
    setPicked(null);
    setProgress(null);
    setBusy(false);
  };

  const start = async () => {
    if (!picked || !pilotUrl) return;
    setBusy(true);
    setProgress(0);
    try {
      const blob = await zipForUpload(picked);
      const { token } = await tokenMutation.mutateAsync({ projectId });
      const name = picked.name.replace(/\.zip$/i, "");
      const result = await uploadZip(
        `${pilotUrl}/api/v1/imports/${projectId}?name=${encodeURIComponent(name)}`,
        token,
        blob,
        setProgress
      );
      if (!result.ok) {
        throw new Error(result.error ?? `Upload failed (${result.status}).`);
      }
      const { netlify } = await finalizeMutation.mutateAsync({ projectId });
      await queryClient.invalidateQueries();
      setOpen(false);
      reset();
      toast.success("New version imported.", {
        description: netlify
          ? "Your live site still shows the old version until you redeploy."
          : undefined,
        action: netlify
          ? {
              label: "Redeploy",
              onClick: () => router.push(`${repoPath(projectId)}/netlify`),
            }
          : undefined,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed. Try again.");
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Button icon={<Upload className="size-[15px]" />} onClick={() => setOpen(true)}>
        Import
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import a new version</DialogTitle>
          <DialogDescription>
            Replaces every file in this project with the folder or zip you pick. Unpublished
            editor changes are discarded. Your live site keeps the current version until you
            redeploy.
          </DialogDescription>
        </DialogHeader>

        <UploadDropzone picked={picked} onPick={pick} />

        {progress !== null && (
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-coral transition-[width]"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}
        {!pilotUrl && (
          <p className="text-[13px] text-dim">Uploads are not configured on this server.</p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!picked || busy || !pilotUrl} onClick={start}>
            {busy ? "Importing…" : "Replace site"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
