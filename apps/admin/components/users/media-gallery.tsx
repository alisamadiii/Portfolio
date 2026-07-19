"use client";

import React, { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { CardAgency } from "@workspace/ui/agency/card-agency";
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
import { Skeleton } from "@workspace/ui/components/skeleton";
import { agency } from "@workspace/ui/lib/agency";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

function isImage(key: string) {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(ext);
}

function fileName(key: string) {
  const parts = key.split("/");
  const raw = parts[parts.length - 1] ?? key;
  // Strip timestamp prefix (e.g. "1712345678901-filename.png" → "filename.png")
  return raw.replace(/^\d+-/, "");
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaGallery({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);

  const prefix = `clients/${userId}/`;
  const queryKey = ["media", prefix];
  const { data: files, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await agency().uploads.list({ prefix });
      if (error) throw new Error(error.message);
      return data.objects
        .filter((o) => !o.key.endsWith("/"))
        .map((o) => ({ key: o.key, size: o.size, publicUrl: o.url }));
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const handleUpload = async (fileList: FileList) => {
    setIsUploading(true);
    for (const file of Array.from(fileList)) {
      const { error } = await agency().uploads.upload(file, {
        path: `clients/${userId}`,
        naming: "uuid-filename",
      });
      if (error) toast.error(`Failed to upload ${file.name}: ${error.message}`);
    }
    setIsUploading(false);
    await invalidate();
  };

  const handleDelete = async () => {
    if (!deleteKey) return;
    setIsDeleting(true);
    const { error } = await agency().uploads.delete({ key: deleteKey });
    setIsDeleting(false);
    if (error) {
      toast.error(`Failed to delete: ${error.message}`);
    } else {
      toast.success("File deleted successfully");
      await invalidate();
    }
    setDeleteKey(null);
  };

  return (
    <>
    <AlertDialog open={!!deleteKey} onOpenChange={(open) => !open && setDeleteKey(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete file</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{deleteKey ? fileName(deleteKey) : ""}&quot;? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <CardAgency.Card>
      <CardAgency.Header title="Media & Files">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept="image/*,.pdf"
          multiple
          onChange={(e) => {
            if (e.target.files?.length) handleUpload(e.target.files);
            e.target.value = "";
          }}
        />
      </CardAgency.Header>

      {/* File grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : files && files.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {files.map((file) =>
            isImage(file.key) ? (
              <div
                key={file.key}
                className="group relative overflow-hidden rounded-xl border"
              >
                <img
                  src={file.publicUrl}
                  alt={fileName(file.key)}
                  className="aspect-square w-full object-cover"
                />
                <button
                  onClick={() => setDeleteKey(file.key)}
                  disabled={isDeleting}
                  className="bg-background/80 absolute top-2 right-2 rounded-lg p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="text-destructive size-4" />
                </button>
                <div className="bg-background/80 absolute bottom-0 left-0 right-0 px-2 py-1">
                  <p className="truncate text-xs">{fileName(file.key)}</p>
                </div>
              </div>
            ) : (
              <div
                key={file.key}
                className="bg-background flex flex-col items-center gap-2 rounded-xl border p-4"
              >
                <FileText className="text-muted-foreground size-8" />
                <p className="w-full truncate text-center text-xs font-medium">
                  {fileName(file.key)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatSize(file.size)}
                </p>
                <div className="flex gap-2">
                  <a
                    href={file.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="text-xs">
                      Download
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive text-xs"
                    disabled={isDeleting}
                    onClick={() => setDeleteKey(file.key)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            )
          )}
        </div>
      ) : (
        <p className="text-muted-foreground py-4 text-center text-sm">
          No files uploaded yet.
        </p>
      )}
    </CardAgency.Card>
    </>
  );
}
