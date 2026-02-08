"use client";

import { useCallback, useEffect, useState } from "react";
import { useClientWorkStore } from "@/context/client-work";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy, Trash } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { storage } from "@/project.config";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";

import { queryClient, useTRPC } from "@workspace/trpc/client";

import { Content } from "@/components/content-admin";

const THUMBNAIL_MAX_WIDTH = 1280;

function captureFirstFrameAsBlob(
  videoFile: File,
  frame: number
): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    const url = URL.createObjectURL(videoFile);

    video.onloadeddata = () => {
      if (frame > 0) {
        video.currentTime = frame;
      }
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
  const { clientWork, setClientWork, isPhone, setIsPhone } =
    useClientWorkStore();
  const [filename, setFilename] = useState("");
  const [frame, setFrame] = useState<number>(0);

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
          const baseName = file.name.replace(/\.[^.]+$/, "");
          const videoName = isPhone ? `${baseName}-PHONE.mp4` : file.name;
          const thumbName = isPhone
            ? `${baseName}-PHONE.jpg`
            : `${baseName}.jpg`;

          const {
            blob: thumbnailBlob,
            width,
            height,
          } = await captureFirstFrameAsBlob(file, frame);
          const thumbnailFile = new File([thumbnailBlob], thumbName, {
            type: "image/jpeg",
          });

          const videoFile = isPhone
            ? new File([file], videoName, { type: file.type })
            : file;

          const [videoUrl, thumbnailUrl] = await uploadFiles(
            [videoFile, thumbnailFile],
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
            from: clientWork,
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
    [uploadFiles, addClientWork, clientWork, frame]
  );

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!filename.trim()) {
        return toast.error("Please enter a filename");
      }

      const files = Array.from(e.clipboardData?.files ?? []).filter(
        (f) => f.type.startsWith("video/") || f.name.endsWith(".mp4")
      );
      const file = files[0];
      if (file) {
        e.preventDefault();
        const base = filename.trim() || file.name.replace(/\.[^.]+$/, "");
        const name = base.endsWith(".mp4") ? base : `${base}.mp4`;
        const renamed = new File([file], name, { type: file.type });
        onDrop([renamed], isPhone);
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [onDrop, isPhone, filename]);

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
      <div className="flex flex-col gap-4">
        <Badge>Pasting Settings</Badge>
        <div className="flex items-center gap-2">
          <Select value={clientWork} onValueChange={setClientWork}>
            <SelectTrigger>
              <SelectValue placeholder="Select client work" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="crosspost">Crosspost</SelectItem>
              <SelectItem value="bless">Bless</SelectItem>
              <SelectItem value="area">Area</SelectItem>
            </SelectContent>
          </Select>
          <Label>
            <Checkbox checked={isPhone} onCheckedChange={setIsPhone} />
            <span>Is phone</span>
          </Label>
          <Input
            placeholder="Filename"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="w-full max-w-xs"
          />
          <Input
            placeholder="Frame"
            type="number"
            value={frame}
            onChange={(e) => setFrame(Number(e.target.value))}
            className="w-full max-w-xs"
          />
        </div>
      </div>
      <Separator className="my-4" />
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
            <div key={work.id} className={cn("relative rounded-xl border p-2")}>
              <video
                src={work.url}
                playsInline
                poster={work.thumbnail ?? undefined}
                controls
                className="rounded-xl"
              />
              <Badge className="absolute top-2 left-2 bg-purple-500">
                {work.from}
              </Badge>
              <div className="absolute top-2 right-2 flex max-w-24 flex-wrap gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(work.url);
                    toast.success("URL copied");
                  }}
                >
                  <Copy className="mr-1 h-3 w-3" /> URL
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (work.thumbnail)
                      navigator.clipboard.writeText(work.thumbnail);
                    toast.success("Thumbnail copied");
                  }}
                  disabled={!work.thumbnail}
                >
                  <Copy className="mr-1 h-3 w-3" /> Thumb
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      JSON.stringify(work, null, 2)
                    );
                    toast.success("JSON copied");
                  }}
                >
                  <Copy className="mr-1 h-3 w-3" /> JSON
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteClientWork.mutate(work.id)}
                  isLoading={deleteClientWork.isPending}
                >
                  <Trash />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Content>
  );
}
