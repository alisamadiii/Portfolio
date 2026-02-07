"use client";

import { useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Trash } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { storage } from "@/project.config";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import { queryClient, useTRPC } from "@workspace/trpc/client";

import { Content } from "@/components/content-admin";

const THUMBNAIL_MAX_WIDTH = 1280;

function captureFirstFrameAsBlob(
  videoFile: File
): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    const url = URL.createObjectURL(videoFile);

    video.onloadeddata = () => {
      video.currentTime = 0;
    };

    video.onseeked = () => {
      try {
        let w = video.videoWidth;
        let h = video.videoHeight;
        if (w > THUMBNAIL_MAX_WIDTH) {
          h = Math.round((h * THUMBNAIL_MAX_WIDTH) / w);
          w = THUMBNAIL_MAX_WIDTH;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Could not get canvas context"));
          return;
        }
        ctx.drawImage(video, 0, 0);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (blob) resolve({ blob, width: w, height: h });
            else reject(new Error("Failed to create thumbnail blob"));
          },
          "image/jpeg",
          0.82
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video"));
    };

    video.src = url;
  });
}

export default function ClientWorkPage() {
  const { uploadFiles, progress } = storage.useUpload();
  const deleteFilesMutation = storage.useDeleteFilesMutation({
    isClientWork: true,
  });

  const trpc = useTRPC();
  const getClientWork = useQuery(trpc.admin.clientWork.get.queryOptions());
  const addClientWork = useMutation(
    trpc.admin.clientWork.add.mutationOptions({
      onSuccess: () => {
        toast.success("Client work added successfully");
        queryClient.invalidateQueries({
          queryKey: trpc.admin.clientWork.get.queryKey(),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const deleteClientWork = useMutation(
    trpc.admin.clientWork.delete.mutationOptions({
      onSuccess: (data) => {
        toast.success("Client work deleted successfully");

        if (data.url && data.thumbnail) {
          deleteFilesMutation.mutate([data.url, data.thumbnail], {
            onSuccess: () => {
              toast.success("Files deleted successfully from storage");
            },
            onError: (error) => {
              toast.error(error.message);
            },
          });
        } else if (data.url) {
          deleteFilesMutation.mutate([data.url], {
            onSuccess: () => {
              toast.success("Files deleted successfully from storage");
            },
            onError: (error) => {
              toast.error(error.message);
            },
          });
        } else if (data.thumbnail) {
          deleteFilesMutation.mutate([data.thumbnail], {
            onSuccess: () => {
              toast.success("Files deleted successfully from storage");
            },
            onError: (error) => {
              toast.error(error.message);
            },
          });
        }

        queryClient.invalidateQueries({
          queryKey: trpc.admin.clientWork.get.queryKey(),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[], isPhone?: boolean) => {
      for (const file of acceptedFiles) {
        try {
          const {
            blob: thumbnailBlob,
            width,
            height,
          } = await captureFirstFrameAsBlob(file);
          const thumbnailFile = new File(
            [thumbnailBlob],
            file.name.replace(/\.[^.]+$/, "") + "-thumb.jpg",
            { type: "image/jpeg" }
          );

          const [videoUrl, thumbnailUrl] = await uploadFiles(
            [file, thumbnailFile],
            {
              path: "public/client-work",
              dontAddFileToDb: true,
            }
          );

          console.log(videoUrl, thumbnailUrl);

          addClientWork.mutate({
            title: file.name.replace(/\.[^.]+$/, ""),
            description: "",
            url: videoUrl,
            thumbnail: thumbnailUrl,
            from: "crosspost",
            isPhone: isPhone ?? false,
            width,
            height,
          });

          toast.success("Client work uploaded successfully");
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Failed to create thumbnail"
          );
        }
      }
    },
    [uploadFiles, addClientWork]
  );

  const clientWorkFolder = useDropzone({
    onDrop: (acceptedFiles) => onDrop(acceptedFiles),
    onDropRejected: (rejections) => {
      const msg = rejections[0]?.errors[0]?.message ?? "Invalid file";
      toast.error(msg);
    },
    accept: {
      "video/*": [".mp4"],
    },
  });
  const clientWorkPhoneFolder = useDropzone({
    onDrop: (acceptedFiles) => onDrop(acceptedFiles, true),
    onDropRejected: (rejections) => {
      const msg = rejections[0]?.errors[0]?.message ?? "Invalid file";
      toast.error(msg);
    },
    accept: {
      "video/*": [".mp4"],
    },
  });

  return (
    <Content className="pb-24">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Client Work
      </h1>
      <div>
        {Math.floor(progress)}% -{" "}
        {addClientWork.isPending ? "Adding..." : "Idle"}
      </div>
      <div className="relative grid md:grid-cols-2">
        <div
          {...clientWorkFolder.getRootProps()}
          className={cn(
            "flex h-96 w-full items-center justify-center border border-dashed border-r-transparent p-4 md:rounded-l-md",
            clientWorkFolder.isDragActive && "border-primary bg-primary/10"
          )}
        >
          <input {...clientWorkFolder.getInputProps()} />
          <p>Upload client work (mp4 only)</p>
        </div>
        <div
          {...clientWorkPhoneFolder.getRootProps()}
          className={cn(
            "flex h-96 w-full items-center justify-center border border-dashed p-4 md:rounded-r-md",
            clientWorkPhoneFolder.isDragActive &&
              "border-destructive bg-destructive/10"
          )}
        >
          <input {...clientWorkPhoneFolder.getInputProps()} />
          <p>Upload client work (mp4 only) for phone videos</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Videos</h2>
        <div className="grid grid-cols-4 gap-4">
          {getClientWork.data?.map((work) => (
            <div
              key={work.id}
              className={cn(
                "relative rounded-xl border p-2",
                work.isPhone && "bg-blue-500"
              )}
            >
              <video
                src={work.url}
                playsInline
                poster={work.thumbnail ?? undefined}
                controls
                className="rounded-xl"
              />
              <Button
                variant="destructive"
                onClick={() => deleteClientWork.mutate(work.id)}
                isLoading={deleteClientWork.isPending}
                className="absolute top-2 right-2"
              >
                <Trash />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Content>
  );
}
