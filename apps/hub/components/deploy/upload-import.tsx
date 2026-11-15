"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

import { useTRPC } from "@workspace/trpc/client";

import { repoPath } from "@/lib/paths";

import {
  pilotUrl,
  type Picked,
  UploadDropzone,
  uploadZip,
  zipForUpload,
} from "./upload-dropzone";

/**
 * Netlify-style import: drop a folder or a zip. A folder is packed into a zip
 * in the browser (fflate); either way one zip is uploaded STRAIGHT to
 * content-pilot (Vercel's request-body cap rules out proxying through the hub)
 * with a one-time import token from deploy.importUpload, then
 * deploy.finalizeUpload reveals the project.
 */

export const UploadImport = ({
  onBack,
  onClose,
}: {
  onBack: () => void;
  onClose: () => void;
}) => {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [picked, setPicked] = useState<Picked | null>(null);
  const [name, setName] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const importMutation = useMutation(trpc.deploy.importUpload.mutationOptions());
  const finalizeMutation = useMutation(
    trpc.deploy.finalizeUpload.mutationOptions()
  );
  const cancelMutation = useMutation(trpc.deploy.cancelUpload.mutationOptions());

  const pick = useCallback((next: Picked) => {
    setPicked(next);
    setName((current) => current || next.name.replace(/\.zip$/i, ""));
  }, []);

  const start = async () => {
    if (!picked || !pilotUrl) return;
    setBusy(true);
    setProgress(0);
    let projectId: string | null = null;
    try {
      const blob = await zipForUpload(picked);

      const reserved = await importMutation.mutateAsync({
        name: name.trim() || picked.name,
      });
      projectId = reserved.projectId;

      const result = await uploadZip(
        `${pilotUrl}/api/v1/imports?projectId=${reserved.projectId}&name=${encodeURIComponent(reserved.name)}`,
        reserved.importToken,
        blob,
        setProgress
      );
      if (!result.ok) {
        throw new Error(result.error ?? `Upload failed (${result.status}).`);
      }

      await finalizeMutation.mutateAsync({ projectId: reserved.projectId });
      toast.success("Project imported.");
      await queryClient.invalidateQueries();
      onClose();
      router.push(repoPath(reserved.projectId));
    } catch (error) {
      if (projectId !== null) {
        cancelMutation.mutate({ projectId });
      }
      toast.error(
        error instanceof Error ? error.message : "Import failed. Try again."
      );
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Upload a folder or zip</DialogTitle>
        <DialogDescription>
          Uploaded projects get the same AI editing canvas for previewing
          changes. They aren't hosted or deployed anywhere.
        </DialogDescription>
      </DialogHeader>

      <UploadDropzone picked={picked} onPick={pick} />

      <div className="mt-4 space-y-1.5">
        <Label>Project name</Label>
        <Input
          value={name}
          placeholder="my-site"
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {progress !== null && (
        <div className="bg-muted mt-4 h-1.5 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-[width]"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} disabled={busy}>
          Back
        </Button>
        <Button
          disabled={!picked || !name.trim() || busy || !pilotUrl}
          isLoading={busy}
          onClick={start}
        >
          Import
        </Button>
      </div>
      {!pilotUrl && (
        <p className="text-muted-foreground mt-2 text-[12.5px]">
          Uploads are not configured on this server.
        </p>
      )}
    </div>
  );
};
