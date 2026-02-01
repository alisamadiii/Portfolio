"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { v4 as uuidv4 } from "uuid";

import { storage } from "@/project.config";

import { Card, CardContent } from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import { useTRPC } from "@workspace/trpc/client";
import { RouterOutputs } from "@workspace/trpc/routers/_app";

interface MediaUploadProps {
  sourceId: string;
}

type Theme = NonNullable<
  RouterOutputs["admin"]["sources"]["readById"]["media"][number]["theme"]
>;

const ACCEPT = {
  "image/*": [],
  "video/*": [".mp4", ".webm", ".ogg", ".mov"],
} as const;

export function MediaUpload({ sourceId }: MediaUploadProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [uploadTheme, setUploadTheme] = useState<Theme | undefined>(undefined);
  const [localError, setLocalError] = useState<string | null>(null);

  const createMedia = useMutation(
    trpc.admin.sources.media.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.admin.sources.readById.queryKey(sourceId),
        });
      },
    })
  );

  const {
    uploadFiles,
    isUploading,
    progress,
    error: uploadError,
  } = storage.useUpload({
    onSuccess: (urls) => {
      urls.forEach((url) => {
        const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i);
        createMedia.mutate({
          sourceId,
          type: isVideo ? "video" : "image",
          theme: uploadTheme,
          url,
          alt: undefined,
        });
      });
      setUploadTheme(undefined);
    },
  });

  const processFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setLocalError(null);
      try {
        await uploadFiles(
          files.map((file) => ({ file, name: uuidv4() })),
          { path: "public" }
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setLocalError(
          message.includes("Network Error")
            ? "Network Error: Check S3 CORS configuration and AWS credentials"
            : message
        );
        console.error("Upload error:", err);
      }
    },
    [uploadFiles]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item?.kind === "file") {
          const file = item.getAsFile();
          if (
            file &&
            (file.type.startsWith("image/") || file.type.startsWith("video/"))
          ) {
            files.push(file);
          }
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        processFiles(files);
      }
    },
    [processFiles]
  );

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPT,
    multiple: true,
    disabled: isUploading,
    onDrop: processFiles,
    onDropRejected: (rejections) => {
      const msg = rejections[0]?.errors[0]?.message ?? "Invalid file";
      setLocalError(msg);
    },
  });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 flex items-center gap-4">
          <div className="space-y-1">
            <Label>Theme for uploads (optional)</Label>
            <Select
              value={uploadTheme || "none"}
              onValueChange={(v) =>
                setUploadTheme(v === "none" ? undefined : (v as Theme))
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div
          {...getRootProps()}
          className={`relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
        >
          <input {...getInputProps()} />

          {isUploading ? (
            <div className="space-y-3">
              <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
              <p className="text-sm">Uploading... {Math.round(progress)}%</p>
              <div className="bg-muted mx-auto h-2 max-w-xs overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <Upload className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
              <p className="text-muted-foreground mb-2 text-sm">
                Drag and drop images or videos here,{" "}
                <span className="text-primary underline-offset-4 hover:underline">
                  browse
                </span>
                , or paste (Ctrl+V)
              </p>
              <p className="text-muted-foreground text-xs">
                Supports images and videos
              </p>
            </>
          )}

          {(uploadError || localError) && (
            <p className="text-destructive mt-2 text-sm">
              {uploadError || localError}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
