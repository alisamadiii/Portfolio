"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";

type UploadOptions = {
  /** Folder prefix, e.g. "users" or `clients/${userId}`. */
  path?: string;
  /** Object name. Defaults to the file's own name. */
  filename?: string;
  naming?: "filename" | "uuid" | "uuid-filename";
  overwrite?: boolean;
};

/**
 * Presigns on the server (so the agency API key never reaches the browser),
 * then PUTs the file straight to storage. The PUT uses raw axios on purpose —
 * an Authorization header would invalidate the presigned signature.
 */
export const useUpload = () => {
  const trpc = useTRPC();
  const presign = useMutation(trpc.uploads.presign.mutationOptions());

  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const upload = async (file: File, options?: UploadOptions) => {
    setIsUploading(true);
    setProgress(0);

    try {
      const signed = await presign.mutateAsync({
        filename: options?.filename ?? file.name,
        contentType: file.type || "application/octet-stream",
        contentLength: file.size,
        path: options?.path,
        naming: options?.naming,
        overwrite: options?.overwrite,
      });

      await axios.put(signed.uploadUrl, file, {
        headers: signed.headers,
        onUploadProgress: (event) => {
          setProgress(
            Math.round(((event.loaded ?? 0) / (event.total ?? file.size)) * 100)
          );
        },
      });

      return { key: signed.key, publicUrl: signed.publicUrl };
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `Failed to upload ${file.name}`
      );
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, progress, isUploading };
};
