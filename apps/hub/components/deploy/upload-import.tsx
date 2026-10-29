"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zip } from "fflate";
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

/**
 * Netlify-style import: drop a folder or a zip. A folder is packed into a zip
 * in the browser (fflate); either way one zip is uploaded STRAIGHT to
 * content-pilot (Vercel's request-body cap rules out proxying through the hub)
 * with a one-time import token from deploy.importUpload, then
 * deploy.finalizeUpload reveals the project.
 */

const MAX_ZIP_BYTES = 100 * 1024 * 1024;

const pilotUrl = (process.env.NEXT_PUBLIC_CONTENT_PILOT_URL ?? "").replace(
  /\/+$/,
  ""
);

// Heavy or derived directories that never belong in a site upload.
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", ".vercel"]);
const SKIP_FILES = new Set([".DS_Store"]);

type Picked = { name: string; files: { path: string; file: File }[] };

/** Recursively walk a dropped directory entry into { path, file } pairs. */
const walkEntry = async (
  entry: FileSystemEntry,
  prefix: string,
  out: { path: string; file: File }[]
): Promise<void> => {
  if (entry.isFile) {
    if (SKIP_FILES.has(entry.name)) return;
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject)
    );
    out.push({ path: `${prefix}${entry.name}`, file });
    return;
  }
  if (!entry.isDirectory || SKIP_DIRS.has(entry.name)) return;
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  // readEntries returns batches of <=100; drain until empty.
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject)
    );
    if (!batch.length) break;
    for (const child of batch) {
      await walkEntry(child, `${prefix}${entry.name}/`, out);
    }
  }
};

/** Strip the folder's own name from webkitdirectory paths and filter noise. */
const fromFileList = (files: FileList): Picked | null => {
  const list: { path: string; file: File }[] = [];
  let root = "";
  for (const file of Array.from(files)) {
    const rel = file.webkitRelativePath || file.name;
    const segments = rel.split("/");
    root = segments[0] ?? "";
    const inner = segments.slice(1);
    if (inner.some((s) => SKIP_DIRS.has(s)) || SKIP_FILES.has(file.name)) {
      continue;
    }
    list.push({ path: inner.join("/") || file.name, file });
  }
  return list.length ? { name: root || "site", files: list } : null;
};

const packZip = async (picked: Picked): Promise<Blob> => {
  const tree: Record<string, Uint8Array> = {};
  let total = 0;
  for (const { path, file } of picked.files) {
    total += file.size;
    if (total > MAX_ZIP_BYTES) {
      throw new Error("The folder is larger than 100 MB.");
    }
    tree[path] = new Uint8Array(await file.arrayBuffer());
  }
  const bytes = await new Promise<Uint8Array>((resolve, reject) =>
    zip(tree, { level: 6 }, (err, data) =>
      err ? reject(err) : resolve(data)
    )
  );
  return new Blob([bytes as BlobPart], { type: "application/zip" });
};

const uploadZip = (
  url: string,
  token: string,
  blob: Blob,
  onProgress: (fraction: number) => void
): Promise<{ ok: boolean; status: number; error?: string }> =>
  new Promise((resolve, reject) => {
    // XHR instead of fetch for upload progress events.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", "application/zip");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      let error: string | undefined;
      try {
        error = (JSON.parse(xhr.responseText) as { error?: string }).error;
      } catch {
        // Non-JSON error body.
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, error });
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection."));
    xhr.send(blob);
  });

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
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useMutation(trpc.deploy.importUpload.mutationOptions());
  const finalizeMutation = useMutation(
    trpc.deploy.finalizeUpload.mutationOptions()
  );
  const cancelMutation = useMutation(trpc.deploy.cancelUpload.mutationOptions());

  const pick = useCallback((next: Picked | null) => {
    if (!next) return;
    setPicked(next);
    setName((current) => current || next.name.replace(/\.zip$/i, ""));
  }, []);

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      setDragOver(false);
      const items = Array.from(event.dataTransfer.items ?? []);
      const entry = items[0]?.webkitGetAsEntry?.();
      if (entry?.isDirectory) {
        const files: { path: string; file: File }[] = [];
        const reader = (entry as FileSystemDirectoryEntry).createReader();
        for (;;) {
          const batch = await new Promise<FileSystemEntry[]>(
            (resolve, reject) => reader.readEntries(resolve, reject)
          );
          if (!batch.length) break;
          for (const child of batch) await walkEntry(child, "", files);
        }
        pick(files.length ? { name: entry.name, files } : null);
        return;
      }
      const file = event.dataTransfer.files?.[0];
      if (file && /\.zip$/i.test(file.name)) {
        pick({ name: file.name, files: [{ path: file.name, file }] });
      } else if (file) {
        toast.error("Drop a folder or a .zip file.");
      }
    },
    [pick]
  );

  const start = async () => {
    if (!picked || !pilotUrl) return;
    setBusy(true);
    setProgress(0);
    let projectId: string | null = null;
    try {
      const isZip =
        picked.files.length === 1 && /\.zip$/i.test(picked.files[0]!.path);
      const blob = isZip ? picked.files[0]!.file : await packZip(picked);
      if (blob.size > MAX_ZIP_BYTES) {
        throw new Error("The upload is larger than 100 MB.");
      }

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

  const fileCount = picked
    ? picked.files.length === 1 && /\.zip$/i.test(picked.files[0]!.path)
      ? "zip file"
      : `${picked.files.length} files`
    : null;

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Upload a folder or zip</DialogTitle>
        <DialogDescription>
          Uploaded projects get the same AI editing canvas for previewing
          changes. They aren't hosted or deployed anywhere.
        </DialogDescription>
      </DialogHeader>

      <div
        role="button"
        tabIndex={0}
        onClick={() => zipInputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && zipInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`mt-4 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        {picked ? (
          <>
            <p className="text-[14px] font-medium">{picked.name}</p>
            <p className="text-muted-foreground mt-1 text-[12.5px]">
              {fileCount} ready to upload
            </p>
          </>
        ) : (
          <>
            <p className="text-[14px] font-medium">
              Drag a folder or .zip here
            </p>
            <p className="text-muted-foreground mt-1 text-[12.5px]">
              or click to pick a zip
              {" · "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  folderInputRef.current?.click();
                }}
              >
                choose a folder
              </button>
            </p>
          </>
        )}
      </div>
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) pick({ name: file.name, files: [{ path: file.name, file }] });
          e.target.value = "";
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is a non-standard but universal attribute
        webkitdirectory=""
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) pick(fromFileList(e.target.files));
          e.target.value = "";
        }}
      />

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
