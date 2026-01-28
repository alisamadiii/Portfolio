import React from "react";
import { useCodeEditor } from "@/context/code-editor";
import { useMutation } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  File,
  FileCode,
  FilePlus,
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
          <div className="space-y-0.5 px-1">
            {source.files.map((file) => (
              <FileItem
                key={file.id}
                sourceId={source.id}
                file={file}
                isActive={selectedTab === file.id}
                onClick={() => setSelectedTab(file.id)}
                onDelete={() => {
                  deleteFile.mutate(file.id);
                }}
                onCopy={() => navigator.clipboard.writeText(file.content)}
              />
            ))}

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

function FileItem({
  sourceId,
  file,
  isActive,
  onClick,
  onDelete,
  onCopy,
}: {
  sourceId: string;
  file: RouterOutputs["source"]["readById"]["files"][number];
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onCopy: () => void;
}) {
  const trpc = useTRPC();
  const updateFile = useMutation(trpc.source.file.update.mutationOptions());

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "group flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs",
            isActive
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          onClick={onClick}
        >
          <File className={cn("size-4 shrink-0", "text-muted-foreground")} />
          <span className="flex-1 truncate">{file.filename}</span>
          {updateFile.isPending ? (
            <Spinner className="size-4" />
          ) : file.isPrivate ? (
            <Lock className="size-4 text-red-500" />
          ) : (
            <Unlock className="size-4 text-green-500" />
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
