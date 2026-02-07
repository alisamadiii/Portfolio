import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import { addFile, getSignedUrl } from "../action";
import type { StorageConfig } from "../types";

/**
 * Type helper to extract allowed paths and create path union type
 */
type PathFromConfig<T extends StorageConfig | undefined> = T extends {
  allowedPaths: readonly string[];
}
  ? T["allowedPaths"][number]
  : string;

/**
 * Factory function to create type-safe useUpload hook
 */
export function createUseUpload<TConfig extends StorageConfig | undefined>(
  allowedPaths?: readonly string[]
) {
  return function useUpload({
    onMutate,
    onSuccess,
    onError,
  }: {
    onMutate?: () => void;
    onSuccess?: (data: string[]) => void;
    onError?: (error: Error) => void;
  } = {}) {
    const queryClient = useQueryClient();

    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    /**
     * Type guard to check if an item is a File object
     */
    const isFile = (
      item: File | { file: File; name: string }
    ): item is File => {
      return item instanceof File;
    };

    /**
     * Uploads multiple files to S3 with progress tracking
     * @param files - Array of files to upload (either File[] or { file: File; name: string }[])
     * @param options - Upload options including optional path
     * @returns Promise<string[]> - Array of uploaded file keys
     */
    const uploadFiles = async (
      files: File[] | { file: File; name: string }[],
      options?: {
        path?: PathFromConfig<TConfig>;
        dontAddFileToDb?: boolean;
      }
    ) => {
      onMutate?.();
      try {
        setIsUploading(true);
        setError(null);
        setProgress(0);
        setSuccess([]);

        // Validate path if allowedPaths are configured
        if (
          options?.path &&
          allowedPaths &&
          !allowedPaths.includes(options.path)
        ) {
          throw new Error(
            `Path "${options.path}" is not allowed. Allowed paths: ${allowedPaths.join(", ")}`
          );
        }

        // Extract File objects from either format
        const normalizedFiles: File[] = files.map((item) =>
          isFile(item)
            ? item
            : new File([item.file], item.name, { type: item.file.type })
        );

        // Create all signed URLs in parallel
        const uploadPromises = normalizedFiles.map(async (file) => {
          // Build the key with path prefix if provided
          let key = file.name;
          if (options?.path) {
            const sanitizedFileName = file.name.split("?")[0];
            key = `${options.path}/${sanitizedFileName}`.replace(/\/$/, "");
          }

          const img = new window.Image();
          let width = 0;
          let height = 0;
          if (file.type.includes("image")) {
            await new Promise<void>((resolve, reject) => {
              img.onload = () => {
                width = img.width;
                height = img.height;
                resolve();
              };
              img.onerror = reject;
              img.src = URL.createObjectURL(file);
            });
          } else if (file.type.includes("video")) {
            await new Promise<void>((resolve, reject) => {
              const video = document.createElement("video");
              video.preload = "metadata";
              video.src = URL.createObjectURL(file);
              video.onloadedmetadata = () => {
                width = video.videoWidth || video.width;
                height = video.videoHeight || video.height;
                // Clean up
                URL.revokeObjectURL(video.src);
                if (video.parentNode) {
                  video.parentNode.removeChild(video);
                }
                resolve();
              };
              video.onerror = (e) => {
                URL.revokeObjectURL(video.src);
                if (video.parentNode) {
                  video.parentNode.removeChild(video);
                }
                reject(e);
              };
              // Attach and remove to ensure proper cleanup in some browsers
              // (optional step, usually not strictly needed)
              document.body.appendChild(video);
              // Immediately remove - we only want to ensure it's not clogging memory
              document.body.removeChild(video);
            });
          }

          try {
            const result = await getSignedUrl(key);
            if (result.error) {
              throw new Error(result.error);
            }

            const signedUrl = result.data;
            if (!signedUrl) {
              throw new Error("Failed to get signed URL");
            }

            console.log("signedUrl", signedUrl);

            // Get public URL if environment variable is set
            const customSignedUrl = process.env.NEXT_PUBLIC_AWS_URL
              ? `${process.env.NEXT_PUBLIC_AWS_URL}/${key}`
              : null;

            if (!signedUrl) {
              throw new Error("Failed to get signed URL");
            }

            return {
              file,
              signedUrl,
              customSignedUrl,
              width,
              height,
              isPublic:
                key.startsWith("public") ||
                (options?.path?.startsWith("public") ?? false),
            };
          } catch (error) {
            console.error(`Failed to get signed URL for ${file.name}:`, error);
            throw error;
          }
        });

        const uploadData = await Promise.all(uploadPromises);

        // Upload all files in parallel with progress tracking
        const uploadResults = await Promise.all(
          uploadData.map(
            async ({
              file,
              customSignedUrl,
              signedUrl,
              width,
              height,
              isPublic,
            }) => {
              try {
                if (!signedUrl) {
                  throw new Error("Signed URL is undefined");
                }

                const response = await axios.put(signedUrl, file, {
                  headers: {
                    "Content-Type": file.type,
                  },
                  onUploadProgress: (progressEvent) => {
                    setProgress(
                      (progressEvent.loaded / (progressEvent.total ?? 1)) * 100
                    );
                  },
                });

                if (response.status !== 200) {
                  throw new Error("Failed to upload file");
                }

                if (!options?.dontAddFileToDb) {
                  addFile({
                    name: file.name,
                    isPublic,
                    url: customSignedUrl
                      ? customSignedUrl
                      : signedUrl.split("?")[0],
                    size: file.size,
                    width,
                    height,
                    contentType: file.type,
                  });
                }

                // Update progress
                // setProgress(((index + 1) / files.length) * 100);
                setSuccess((prev) => [...prev, file.name]);

                return signedUrl.split("?")[0];
              } catch (err) {
                console.error(`Failed to upload ${file.name}:`, err);
                throw err;
              }
            }
          )
        );

        queryClient.invalidateQueries({ queryKey: ["files"] });
        onSuccess?.(uploadResults.map((result) => result || ""));
        return uploadResults.map((result) => result || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        onError?.(err instanceof Error ? err : new Error("Upload failed"));
        console.error("Upload error:", err);
        throw err;
      } finally {
        setIsUploading(false);
      }
    };

    return {
      progress,
      error,
      isUploading,
      success,
      reset: () => {
        setProgress(0);
        setError(null);
        setSuccess([]);
        setIsUploading(false);
      },
      uploadFiles,
    };
  };
}
