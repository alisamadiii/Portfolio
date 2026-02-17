// hooks/use-upload.ts
import { useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import { ALLOWED_FOLDERS } from "@workspace/trpc/routers/upload/_index";

interface UploadProgress {
  loaded: number; // bytes uploaded
  total: number; // total bytes
  percentage: number; // 0-100
}

interface UploadResult {
  key: string;
  publicUrl: string;
}

export function useUpload() {
  const trpc = useTRPC();
  const getUploadUrl = useMutation(trpc.upload.getUploadUrl.mutationOptions());
  const deleteFile = useMutation(trpc.upload.delete.mutationOptions());
  const updateFile = useMutation(trpc.upload.update.mutationOptions());

  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const resetProgress = useCallback(() => {
    setProgress(null);
  }, []);

  async function uploadToR2(signedUrl: string, file: File): Promise<void> {
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    await axios.put(signedUrl, file, {
      headers: {
        "Content-Type": file.type,
      },
      onUploadProgress: (event) => {
        if (event.total) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          setProgress({
            loaded: event.loaded,
            total: event.total,
            percentage,
          });
        }
      },
    });
  }

  async function upload(
    file: File,
    config?: {
      key?: string;
      folder?: (typeof ALLOWED_FOLDERS)[number];
    }
  ): Promise<UploadResult | null> {
    setIsUploading(true);
    resetProgress();

    try {
      let data: { signedUrl: string; key: string; publicUrl: string };

      try {
        data = await getUploadUrl.mutateAsync({
          key: config?.key ?? file.name,
          folder: config?.folder,
          contentType: file.type,
          size: file.size,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to get upload URL";
        toast.error(message);
        console.error("Failed to get upload URL:", err);
        return null;
      }

      try {
        await uploadToR2(data.signedUrl, file);
      } catch (err) {
        if (err instanceof AxiosError) {
          console.error(
            "Axios upload error:",
            err.response?.status,
            err.response?.data
          );
          toast.error(
            `Upload failed: ${err.response?.statusText || err.message}`
          );
        } else {
          console.error("Upload to R2 failed:", err);
          toast.error("File upload failed");
        }
        return null;
      }

      toast.success("File uploaded successfully");
      return { key: data.key, publicUrl: data.publicUrl };
    } catch (err) {
      console.error("Unexpected upload error:", err);
      toast.error("An unexpected error occurred during upload");
      return null;
    } finally {
      setIsUploading(false);
    }
  }

  async function remove(key: string): Promise<boolean> {
    try {
      try {
        await deleteFile.mutateAsync({ key });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete file";
        toast.error(message);
        console.error("Failed to delete file:", err);
        return false;
      }

      toast.success("File deleted successfully");
      return true;
    } catch (err) {
      console.error("Unexpected delete error:", err);
      toast.error("An unexpected error occurred during deletion");
      return false;
    }
  }

  async function replace(
    oldKey: string,
    newFile: File
  ): Promise<UploadResult | null> {
    setIsUpdating(true);
    resetProgress();

    try {
      let data: { signedUrl: string; key: string; publicUrl: string };

      try {
        data = await updateFile.mutateAsync({
          oldKey,
          contentType: newFile.type,
          size: newFile.size,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to get update URL";
        toast.error(message);
        console.error("Failed to get update URL:", err);
        return null;
      }

      try {
        await uploadToR2(data.signedUrl, newFile);
      } catch (err) {
        if (err instanceof AxiosError) {
          console.error(
            "Axios replace upload error:",
            err.response?.status,
            err.response?.data
          );
          toast.error(
            `Replace upload failed: ${err.response?.statusText || err.message}`
          );
        } else {
          console.error("Replace upload to R2 failed:", err);
          toast.error("File replace upload failed");
        }
        return null;
      }

      toast.success("File updated successfully");
      return { key: data.key, publicUrl: data.publicUrl };
    } catch (err) {
      console.error("Unexpected replace error:", err);
      toast.error("An unexpected error occurred during file update");
      return null;
    } finally {
      setIsUpdating(false);
    }
  }

  return {
    upload,
    remove,
    replace,
    progress,
    resetProgress,
    isUploading,
    isDeleting: deleteFile.isPending,
    isUpdating,
  };
}
