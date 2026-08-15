"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios, { type AxiosProgressEvent } from "axios";
import {
  CheckIcon,
  ChevronLeft,
  ChevronRight,
  ClipboardIcon,
  CloudUploadIcon,
  FileIcon,
  ImageIcon,
  SearchIcon,
  Trash2Icon,
  VideoIcon,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button, buttonVariants } from "@workspace/ui/components/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import { Content } from "@/components/content-admin";

export default function AdminMediaPage() {
  return (
    <Content>
      <h1 className="mb-5 text-xl font-semibold tracking-tight">Media</h1>
      <UploadSection />
      <BrowseSection />
    </Content>
  );
}

const UploadSection = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const getPresignedUrl = useMutation(trpc.uploads.presign.mutationOptions());
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  // This section tracks several concurrent uploads at once, so it drives
  // presign + PUT directly instead of using the single-file useUpload hook.
  const uploadFile = useCallback(
    async (file: File) => {
      const id = crypto.randomUUID();
      const contentType = file.type || "application/octet-stream";
      setUploads((prev) => [
        { id, name: file.name, status: "uploading", progress: 0 },
        ...prev,
      ]);

      try {
        const presign = await getPresignedUrl.mutateAsync({
          filename: file.name,
          contentType,
          contentLength: file.size,
          naming: "uuid-filename",
        });

        await axios.put(presign.uploadUrl, file, {
          headers: presign.headers,
          onUploadProgress: (e: AxiosProgressEvent) => {
            const progress = Math.round(
              ((e.loaded ?? 0) / (e.total ?? 1)) * 100
            );
            setUploads((prev) =>
              prev.map((u) => (u.id === id ? { ...u, progress } : u))
            );
          },
        });

        setUploads((prev) =>
          prev.map((u) =>
            u.id === id ? { ...u, status: "done", url: presign.publicUrl } : u
          )
        );

        queryClient.invalidateQueries(trpc.uploads.list.pathFilter());
      } catch (error) {
        setUploads((prev) =>
          prev.map((u) => (u.id === id ? { ...u, status: "error" } : u))
        );
        toast.error(
          error instanceof Error
            ? error.message
            : `Failed to upload ${file.name}`
        );
      }
    },
    [queryClient, trpc, getPresignedUrl]
  );

  // Paste to upload
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      Array.from(items).forEach((item) => {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) uploadFile(file);
        }
      });
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => acceptedFiles.forEach(uploadFile),
  });

  return (
    <div className="mb-6">
      <div
        {...getRootProps()}
        className={cn(
          "border-border bg-card hover:bg-muted/50 flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-5 transition-colors",
          isDragActive && "bg-muted/50 border-primary"
        )}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon className="text-muted-foreground size-5" />
        <p className="text-muted-foreground text-xs">
          Drag & drop, click to select, or paste an image
        </p>
      </div>

      {uploads.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {uploads.map((item) => (
            <UploadRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

type UploadItem = {
  id: string;
  name: string;
  status: "uploading" | "done" | "error";
  progress?: number;
  url?: string;
};

const UploadRow = ({ item }: { item: UploadItem }) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!item.url) return;
    navigator.clipboard.writeText(item.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card border-border flex h-9 items-center gap-3 rounded-md border px-3">
      <FileTypeIcon
        name={item.name}
        className="text-muted-foreground size-3.5 shrink-0"
      />
      <span className="text-num text-foreground min-w-0 flex-1 truncate text-xs">
        {item.name}
      </span>

      {item.status === "uploading" && (
        <div className="flex items-center gap-2">
          <div className="bg-muted h-1.5 w-24 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${item.progress ?? 0}%` }}
            />
          </div>
          <span className="text-num text-muted-foreground text-xs">
            {item.progress ?? 0}%
          </span>
        </div>
      )}

      {item.status === "done" && item.url && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground max-w-[200px] truncate text-xs">
            {item.url}
          </span>
          <Button size="icon" variant="ghost" className="size-7" onClick={copy}>
            {copied ? (
              <CheckIcon className="size-3.5" />
            ) : (
              <ClipboardIcon className="size-3.5" />
            )}
          </Button>
          <Badge variant="secondary" className="text-xs">
            Done
          </Badge>
        </div>
      )}

      {item.status === "error" && (
        <Badge variant="destructive" className="text-xs">
          Failed
        </Badge>
      )}
    </div>
  );
};

const BrowseSection = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const currentCursor = cursorStack.at(-1);

  const { data, isPending, error } = useQuery({
    ...trpc.uploads.list.queryOptions({
      prefix: search || undefined,
      cursor: currentCursor,
    }),
    select: (data) => ({
      files: data.objects
        .filter((o) => !o.key.endsWith("/"))
        .map((o) => ({
          key: o.key,
          size: o.size,
          lastModified: o.lastModified,
          publicUrl: o.url,
        })),
      nextCursor: data.nextCursor,
    }),
  });

  const deleteFile = useMutation(
    trpc.uploads.delete.mutationOptions({
      onSuccess: () => {
        if (data?.files.length === 1 && cursorStack.length > 0) {
          setCursorStack((prev) => prev.slice(0, -1));
        }
        queryClient.invalidateQueries(trpc.uploads.list.pathFilter());
        toast.success("File deleted");
      },
      onError: () => toast.error("Failed to delete file"),
    })
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setCursorStack([]);
  };

  const goToNextPage = () => {
    if (data?.nextCursor) {
      setCursorStack((prev) => [...prev, data.nextCursor!]);
    }
  };

  const goToPrevPage = () => {
    setCursorStack((prev) => prev.slice(0, -1));
  };

  const pageNumber = cursorStack.length + 1;
  const hasNextPage = !!data?.nextCursor;
  const hasPrevPage = cursorStack.length > 0;

  return (
    <div>
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <InputGroup className="h-8 flex-1">
          <InputGroupAddon>
            <SearchIcon className="size-3.5" />
          </InputGroupAddon>
          <InputGroupInput
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by filename prefix…"
          />
        </InputGroup>
        <Button type="submit" variant="secondary" size="sm" className="h-8">
          Search
        </Button>
        {search && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => {
              setSearch("");
              setSearchInput("");
              setCursorStack([]);
            }}
          >
            Clear
          </Button>
        )}
      </form>

      {isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <p className="text-destructive py-4 text-sm">Failed to load files.</p>
      ) : !data?.files.length ? (
        <p className="text-muted-foreground text-sm">No files found.</p>
      ) : (
        <div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {data.files.map((file) => (
              <FileTile
                key={file.key}
                file={file}
                onDelete={() => deleteFile.mutate({ key: file.key })}
                isDeleting={
                  deleteFile.isPending && deleteFile.variables?.key === file.key
                }
              />
            ))}
          </div>
          <div className="text-muted-foreground mt-2 flex items-center justify-end gap-2 rounded-md border px-3 py-2 text-xs">
            <Button
              variant="outline"
              size="sm"
              className="size-6 p-0"
              onClick={goToPrevPage}
              disabled={!hasPrevPage}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <p className="text-num mx-1">
              <span className="text-foreground">{pageNumber}</span>
            </p>
            <Button
              variant="outline"
              size="sm"
              className="size-6 p-0"
              onClick={goToNextPage}
              disabled={!hasNextPage}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

type FileTileProps = {
  file: {
    key: string;
    size: number;
    lastModified: string | null;
    publicUrl: string;
  };
  onDelete: () => void;
  isDeleting: boolean;
};

const FileTile = ({ file, onDelete, isDeleting }: FileTileProps) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(file.publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isImage = /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(file.key);

  return (
    <div className="group flex flex-col gap-1.5">
      <div className="bg-card relative aspect-square overflow-hidden rounded-xl border">
        {isImage ? (
          <img
            src={file.publicUrl}
            alt={file.key}
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <FileTypeIcon
              name={file.key}
              className="text-muted-foreground size-8"
            />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            size="icon"
            variant="secondary"
            className="size-8"
            onClick={copy}
            title="Copy URL"
          >
            {copied ? (
              <CheckIcon className="size-3.5" />
            ) : (
              <ClipboardIcon className="size-3.5" />
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  size="icon"
                  variant="secondary"
                  className="text-destructive hover:text-destructive size-8"
                  disabled={isDeleting}
                />
              }
            >
              {isDeleting ? (
                <Spinner className="size-4" />
              ) : (
                <Trash2Icon className="size-4" />
              )}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete file?</AlertDialogTitle>
                <AlertDialogDescription className="break-all">
                  {file.key}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className={buttonVariants({ variant: "destructive" })}
                  onClick={onDelete}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="min-w-0 px-0.5">
        <p className="text-num truncate text-xs">{file.key}</p>
        <p className="text-num text-muted-foreground text-[11px]">
          {formatBytes(file.size)}
          {file.lastModified && (
            <> · {new Date(file.lastModified).toLocaleDateString()}</>
          )}
        </p>
      </div>
    </div>
  );
};

const FileTypeIcon = ({
  name,
  className,
}: {
  name: string;
  className?: string;
}) => {
  if (/\.(png|jpe?g|gif|webp|svg|avif)$/i.test(name))
    return <ImageIcon className={className} />;
  if (/\.(mp4|mov|webm|avi)$/i.test(name))
    return <VideoIcon className={className} />;
  return <FileIcon className={className} />;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
