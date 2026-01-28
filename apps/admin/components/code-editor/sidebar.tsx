import React, { useState } from "react";
import { useCodeEditor } from "@/context/code-editor";
import { useMutation } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  File,
  FileCode,
  FilePlus,
  GripVertical,
  Image,
  ImagePlus,
  Lock,
  Pencil,
  Trash2,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu";
import { Input } from "@workspace/ui/components/input";
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";

import { queryClient, useTRPC } from "@workspace/trpc/client";
import { RouterOutputs } from "@workspace/trpc/routers/_app";

export const Sidebar = ({
  source,
}: {
  source: RouterOutputs["source"]["readById"];
}) => {
  const {
    fileExpanded,
    setFileExpanded,
    mediaExpanded,
    setMediaExpanded,
    newFile,
    setNewFile,
    showNewFile,
    setShowNewFile,
    setSelectedTab,
    selectedTab,
  } = useCodeEditor();

  const trpc = useTRPC();
  const createFile = useMutation(
    trpc.source.file.create.mutationOptions({
      onSuccess: (data) => {
        invalidate();
        setShowNewFile(false);
        setNewFile("");
        if (data) setSelectedTab(data.id);
      },
    })
  );

  const deleteFile = useMutation(
    trpc.source.file.delete.mutationOptions({ onSuccess: () => invalidate() })
  );

  const deleteMedia = useMutation(
    trpc.source.media.delete.mutationOptions({ onSuccess: () => invalidate() })
  );

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: trpc.source.readById.queryKey(source.id),
    });
  };

  return (
    <div className="bg-muted/30 flex w-56 flex-col border-r">
      <div className="flex-1 overflow-auto">
        {/* Files Section */}
        <button
          className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1 px-3 py-2 text-xs font-semibold tracking-wider uppercase"
          onClick={() => setFileExpanded(!fileExpanded)}
        >
          {fileExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          Files
          <span className="ml-auto opacity-50">{source.files.length}</span>
        </button>

        {fileExpanded && (
          <>
            <FileList source={source}>
              {(sortedFiles, dragHandlers, isReordering) =>
                sortedFiles.map((file, index) => (
                  <FileItem
                    key={file.id}
                    sourceId={source.id}
                    file={file}
                    isActive={selectedTab === file.id}
                    onClick={() => setSelectedTab(file.id)}
                    onDelete={() => deleteFile.mutate(file.id)}
                    onCopy={() => navigator.clipboard.writeText(file.content)}
                    dragHandlers={dragHandlers(index)}
                    isReordering={isReordering}
                  />
                ))
              }
            </FileList>

            <div className="px-1">
              {showNewFile ? (
                <div className="bg-muted mx-1 flex items-center gap-1 rounded p-1">
                  <FileCode className="text-muted-foreground size-4 shrink-0" />
                  <Input
                    autoFocus
                    value={newFile}
                    onChange={(e) => setNewFile(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newFile) {
                        createFile.mutate({
                          sourceId: source.id,
                          filename: newFile,
                          content: "",
                        });
                      }
                      if (e.key === "Escape") setShowNewFile(false);
                    }}
                    placeholder="filename.ts"
                    className="h-6 border-none bg-transparent px-1 text-xs focus-visible:ring-0"
                  />
                </div>
              ) : (
                <button
                  className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center gap-2 rounded px-2 py-1 text-xs"
                  onClick={() => setShowNewFile(true)}
                >
                  <FilePlus className="h-3.5 w-3.5" />
                  New file
                </button>
              )}
            </div>
          </>
        )}

        {/* Media Section */}
        <button
          className="text-muted-foreground hover:text-foreground mt-4 flex w-full items-center gap-1 px-3 py-2 text-xs font-semibold tracking-wider uppercase"
          onClick={() => setMediaExpanded(!mediaExpanded)}
        >
          {mediaExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          Media
          <span className="ml-auto opacity-50">{source.media.length}</span>
        </button>

        {mediaExpanded && (
          <div className="space-y-0.5 px-1">
            {source.media.map((media) => (
              <MediaItem
                key={media.id}
                media={media}
                onDelete={() => deleteMedia.mutate(media.id)}
                onCopyUrl={() => navigator.clipboard.writeText(media.url)}
              />
            ))}
            <button
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center gap-2 rounded px-2 py-1 text-xs"
              onClick={() => setSelectedTab("media")}
            >
              <ImagePlus className="h-3.5 w-3.5" />
              Add media
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// FileList with drag and drop
function FileList({
  source,
  children,
}: {
  source: RouterOutputs["source"]["readById"];
  children: (
    sortedFiles: RouterOutputs["source"]["readById"]["files"],
    dragHandlers: (index: number) => {
      draggable: boolean;
      onDragStart: (e: React.DragEvent) => void;
      onDragOver: (e: React.DragEvent) => void;
      onDragEnd: () => void;
      onDrop: (e: React.DragEvent) => void;
    },
    isReordering: boolean
  ) => React.ReactNode;
}) {
  const trpc = useTRPC();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const reorderFiles = useMutation(
    trpc.source.file.reorder.mutationOptions({
      onMutate: async (updates) => {
        // Optimistically update the cache
        queryClient.setQueryData(
          trpc.source.readById.queryKey(source.id),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              files: old.files.map((file) => {
                const update = updates.find((u) => u.id === file.id);
                return update ? { ...file, index: update.index } : file;
              }),
            };
          }
        );
      },
      onError: (error) => {
        toast.error(error.message || "Failed to reorder files");
        // Refetch to restore correct order on error
        queryClient.invalidateQueries({
          queryKey: trpc.source.readById.queryKey(source.id),
        });
      },
    })
  );

  const sortedFiles = [...source.files].sort((a, b) => a.index - b.index);

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = () => (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newFiles = [...sortedFiles];
    const [draggedFile] = newFiles.splice(draggedIndex, 1);
    newFiles.splice(dropIndex, 0, draggedFile!);

    const updates = newFiles.map((file, index) => ({
      id: file.id,
      index,
    }));

    reorderFiles.mutate(updates);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const dragHandlers = (index: number) => ({
    draggable: !reorderFiles.isPending,
    onDragStart: handleDragStart(index),
    onDragOver: handleDragOver(),
    onDragEnd: handleDragEnd,
    onDrop: handleDrop(index),
  });

  return (
    <div className="space-y-0.5 px-1">
      {children(sortedFiles, dragHandlers, reorderFiles.isPending)}
    </div>
  );
}

function FileItem({
  sourceId,
  file,
  isActive,
  onClick,
  onDelete,
  onCopy,
  dragHandlers,
  isReordering,
}: {
  sourceId: string;
  file: RouterOutputs["source"]["readById"]["files"][number];
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onCopy: () => void;
  dragHandlers?: {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    onDrop: (e: React.DragEvent) => void;
  };
  isReordering?: boolean;
}) {
  const trpc = useTRPC();
  const updateFile = useMutation(trpc.source.file.update.mutationOptions());

  const isLoading = updateFile.isPending || isReordering;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "group flex cursor-pointer items-center gap-1 rounded px-1 py-1 text-xs",
            isActive
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            isReordering && "opacity-70"
          )}
          onClick={onClick}
          {...dragHandlers}
        >
          {isReordering ? (
            <Spinner className="size-3 shrink-0" />
          ) : (
            <GripVertical className="size-3 shrink-0 cursor-grab opacity-0 group-hover:opacity-50 active:cursor-grabbing" />
          )}
          <File className={cn("size-4 shrink-0", "text-muted-foreground")} />
          <span className="flex-1 truncate">{file.filename}</span>
          {isLoading ? null : file.isPrivate ? (
            <Lock className="size-3 text-red-500" />
          ) : (
            <Unlock className="size-3 text-green-500" />
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onClick}>
          <Pencil className="mr-2 size-4" />
          Open
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() =>
            updateFile.mutate(
              { id: file.id, isPrivate: !file.isPrivate },
              {
                onSuccess: () => {
                  queryClient.setQueryData(
                    trpc.source.readById.queryKey(sourceId),
                    (old) => {
                      if (!old) return old;
                      return {
                        ...old,
                        files: old.files.map((f) =>
                          f.id === file.id
                            ? { ...f, isPrivate: !f.isPrivate }
                            : f
                        ),
                      };
                    }
                  );
                },
                onError: (error) => {
                  toast.error(error.message);
                },
              }
            )
          }
        >
          <Lock className="mr-2 size-4" />
          {file.isPrivate ? "Make Public" : "Make Private"}
        </ContextMenuItem>
        <ContextMenuItem onClick={onCopy}>
          <Copy className="mr-2 size-4" />
          Copy Content
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 size-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function MediaItem({
  media,
  onDelete,
  onCopyUrl,
}: {
  media: RouterOutputs["source"]["readById"]["media"][number];
  onDelete: () => void;
  onCopyUrl: () => void;
}) {
  const { selectedTab, setSelectedTab } = useCodeEditor();

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "group flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs",
            selectedTab === media.id
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          onClick={() => setSelectedTab(media.id)}
        >
          {media.type === "image" ? (
            <img
              src={media.url}
              alt={media.alt || ""}
              className="h-5 w-5 shrink-0 rounded object-cover"
            />
          ) : (
            <Image className="text-muted-foreground size-4 shrink-0" />
          )}
          <span className="flex-1 truncate">{media.url.split("/").pop()}</span>
          {media.theme && (
            <span className="bg-muted shrink-0 rounded px-1 text-[10px]">
              {media.theme}
            </span>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onCopyUrl}>
          <Copy className="mr-2 size-4" />
          Copy URL
        </ContextMenuItem>
        <ContextMenuItem onClick={() => window.open(media.url, "_blank")}>
          <Image className="mr-2 size-4" />
          Open in New Tab
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 size-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
