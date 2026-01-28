"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";

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
  RouterOutputs["source"]["readById"]["media"][number]["theme"]
>;

export function MediaUpload({ sourceId }: MediaUploadProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [uploadTheme, setUploadTheme] = useState<Theme | undefined>(undefined);
  const [localError, setLocalError] = useState<string | null>(null);

  const createMedia = useMutation(
    trpc.source.media.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.source.readById.queryKey(sourceId),
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

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setLocalError(null);
    try {
      await uploadFiles(Array.from(files), { path: "public" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setLocalError(
        message.includes("Network Error")
          ? "Network Error: Check S3 CORS configuration and AWS credentials"
          : message
      );
      console.error("Upload error:", err);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

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
          className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />

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
                Drag and drop images or videos here, or{" "}
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  browse
                </button>
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
