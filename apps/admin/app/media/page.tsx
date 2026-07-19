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
import { agency } from "@workspace/ui/lib/agency";
import { cn } from "@workspace/ui/lib/utils";

import { Content } from "@/components/content-admin";

export default function AdminMediaPage() {
  return (
    <Content>
      <h1>Media</h1>
      <UploadSection />
      <BrowseSection />
    </Content>
  );
}

const UploadSection = () => {
  const queryClient = useQueryClient();
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  const uploadFile = useCallback(
    async (file: File) => {
      const id = crypto.randomUUID();
      const contentType = file.type || "application/octet-stream";
      setUploads((prev) => [
        { id, name: file.name, status: "uploading", progress: 0 },
        ...prev,
      ]);

      try {
        const { data: presign, error } = await agency().uploads.presign({
          filename: file.name,
          contentType,
          contentLength: file.size,
          naming: "uuid-filename",
        });
        if (error || !presign) {
          throw new Error(error?.message ?? "Failed to get upload URL");
        }

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

        queryClient.invalidateQueries({ queryKey: ["media"] });
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
    [queryClient]
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
    <div className="mb-10">
      <div
        {...getRootProps()}
        className={cn(
          "border-border hover:bg-muted/50 flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 transition-colors",
          isDragActive && "bg-muted/50 border-primary"
        )}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon className="text-muted-foreground size-10" />
        <p className="text-muted-foreground text-sm">
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
    <div className="bg-card border-border flex items-center gap-3 rounded-lg border px-4 py-3">
      <FileTypeIcon
        name={item.name}
        className="text-muted-foreground size-4 shrink-0"
      />
      <span className="text-foreground min-w-0 flex-1 truncate text-sm">
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
          <span className="text-muted-foreground text-xs">
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
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const currentCursor = cursorStack.at(-1);

  const { data, isPending, error } = useQuery({
    queryKey: ["media", search, currentCursor],
    queryFn: async () => {
      const { data, error } = await agency().uploads.list({
        prefix: search || undefined,
        cursor: currentCursor,
      });
      if (error) throw new Error(error.message);
      return {
        files: data.objects
          .filter((o) => !o.key.endsWith("/"))
          .map((o) => ({
            key: o.key,
            size: o.size,
            lastModified: o.lastModified,
            publicUrl: o.url,
          })),
        nextCursor: data.nextCursor,
      };
    },
  });

  const deleteFile = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await agency().uploads.delete({ key });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      if (data?.files.length === 1 && cursorStack.length > 0) {
        setCursorStack((prev) => prev.slice(0, -1));
      }
      queryClient.invalidateQueries({ queryKey: ["media"] });
      toast.success("File deleted");
    },
    onError: () => toast.error("Failed to delete file"),
  });

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
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <InputGroup className="flex-1">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by filename prefix..."
          />
        </InputGroup>
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {search && (
          <Button
            type="button"
            variant="ghost"
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
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <p className="text-destructive py-4 text-sm">Failed to load files.</p>
      ) : !data?.files.length ? (
        <p className="text-muted-foreground text-sm">No files found.</p>
      ) : (
        <div>
          <div className="flex flex-col gap-2">
            {data.files.map((file) => (
              <FileRow
                key={file.key}
                file={file}
                onDelete={() => deleteFile.mutate(file.key)}
                isDeleting={
                  deleteFile.isPending && deleteFile.variables === file.key
                }
              />
            ))}
          </div>
          <div className="bg-muted text-muted-foreground -mt-3 flex items-center justify-end rounded-b-xl p-4 pt-7 text-xs">
            <div className="flex items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevPage}
                disabled={!hasPrevPage}
              >
                <ChevronLeft />
              </Button>
              <p className="mx-2 tabular-nums">
                <span className="text-foreground">{pageNumber}</span>
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={!hasNextPage}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

type FileRowProps = {
  file: {
    key: string;
    size: number;
    lastModified: string | null;
    publicUrl: string;
  };
  onDelete: () => void;
  isDeleting: boolean;
};

const FileRow = ({ file, onDelete, isDeleting }: FileRowProps) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(file.publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isImage = /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(file.key);

  return (
    <div className="bg-card border-border flex items-center gap-3 rounded-lg border px-4 py-3">
      {isImage ? (
        <img
          src={file.publicUrl}
          alt={file.key}
          className="size-10 shrink-0 rounded object-cover"
          loading="lazy"
        />
      ) : (
        <FileTypeIcon
          name={file.key}
          className="text-muted-foreground size-5 shrink-0"
        />
      )}

      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm">{file.key}</p>
        <p className="text-muted-foreground text-xs">
          {formatBytes(file.size)}
          {file.lastModified && (
            <> · {new Date(file.lastModified).toLocaleDateString()}</>
          )}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" className="size-8" onClick={copy}>
          {copied ? (
            <CheckIcon className="size-4" />
          ) : (
            <ClipboardIcon className="size-4" />
          )}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                size="icon"
                variant="ghost"
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
