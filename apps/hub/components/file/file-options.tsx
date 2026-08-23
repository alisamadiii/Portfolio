"use client";

import { useMemo, useState } from "react";
import { useConfig } from "@/contexts/config-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@workspace/trpc/client";
import { ArrowUpRight } from "@/components/icon";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import { handleCmsError } from "@/lib/trpc-errors";
import { getSchemaByName } from "@workspace/cms-core/schema";
import {
  getParentPath,
  getRelativePath,
  joinPathSegments,
  normalizePath,
} from "@workspace/cms-core/utils/file";

import { FileRename } from "@/components/file/file-rename";

export function FileOptions({
  path,
  sha,
  type,
  name,
  canDelete,
  canRename,
  onDelete,
  onRename,
  children,
}: {
  path: string;
  sha: string;
  type: "collection" | "file" | "media" | "settings";
  name?: string;
  canDelete?: boolean;
  canRename?: boolean;
  onDelete?: (path: string) => void;
  onRename?: (path: string, newPath: string) => void;
  children: React.ReactNode;
}) {
  const { config } = useConfig();
  if (!config) throw new Error(`Configuration not found.`);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const deleteFileMutation = useMutation(
    trpc.cms.files.delete.mutationOptions()
  );

  const normalizedPath = useMemo(() => normalizePath(path), [path]);
  const rootPath = useMemo(() => {
    if (type === "media" && name) {
      const schema = getSchemaByName(config.object, name, "media");
      return schema?.input || getParentPath(path);
    }
    if ((type === "collection" || type === "file") && name) {
      const schema = getSchemaByName(config.object, name);
      return schema?.path || getParentPath(path);
    }
    return getParentPath(path);
  }, [type, name, config.object, path]);
  const relativePath = useMemo(
    () => getRelativePath(normalizedPath, rootPath),
    [normalizedPath, rootPath]
  );
  const showRename =
    type !== "settings" && type !== "file" && canRename !== false;
  const showDelete = type !== "settings" && canDelete !== false;
  // const showDelete = false;

  const [newPath, setNewPath] = useState(relativePath);
  const [isRenameOpen, setIsRenameOpen] = useState(false);

  const handleConfirmDelete = async () => {
    try {
      const deletePromise = deleteFileMutation
        .mutateAsync({
          owner: config.owner,
          repo: config.repo,
          branch: config.branch,
          path: normalizedPath,
          sha,
          type: type === "media" ? "media" : "content",
          name,
        })
        .then((data) => {
          if (type === "media") {
            void queryClient.invalidateQueries({
              queryKey: trpc.cms.media.list.queryKey(),
            });
          } else {
            void queryClient.invalidateQueries({
              queryKey: trpc.cms.collections.list.queryKey({
                owner: config.owner,
                repo: config.repo,
                branch: config.branch,
                ...(name ? { name } : {}),
              }),
            });
          }
          // Mark stale only — the delete flow (onDelete) drives the refetch
          // or navigation, so an eager refetch here would 404 mid-transition.
          void queryClient.invalidateQueries({
            queryKey: trpc.cms.entries.get.queryKey({
              owner: config.owner,
              repo: config.repo,
              branch: config.branch,
              path: normalizedPath,
            }),
            refetchType: "none",
          });
          return data;
        });

      toast.promise(deletePromise, {
        loading: `Deleting ${path}`,
        success: (data) => {
          if (onDelete) onDelete(path);
          return data.message;
        },
        error: (error: unknown) =>
          handleCmsError(error, "Failed to delete file"),
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <AlertDialog>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger render={children as React.ReactElement} />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              render={
                <a
                  href={`https://github.com/${config.owner}/${config.repo}/blob/${encodeURIComponent(config.branch)}/${path}`}
                  target="_blank"
                >
                  View on GitHub
                  <ArrowUpRight className="text-muted-foreground ml-auto size-3" />
                </a>
              }
            />
            {showRename || showDelete ? (
              <>
                <DropdownMenuSeparator />
                {showRename && (
                  <DropdownMenuItem onSelect={() => setIsRenameOpen(true)}>
                    Rename
                  </DropdownMenuItem>
                )}
                {showDelete && (
                  <AlertDialogTrigger
                    render={
                      <DropdownMenuItem variant="destructive">
                        Delete
                      </DropdownMenuItem>
                    }
                  />
                )}
              </>
            ) : null}
          </DropdownMenuContent>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to delete this file?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will premanently delete &quot;{path}&quot;.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </DropdownMenu>
      </AlertDialog>

      {showRename && (
        <FileRename
          isOpen={isRenameOpen}
          onOpenChange={setIsRenameOpen}
          path={path}
          type={type}
          sha={sha}
          name={name}
          onRename={onRename}
        />
      )}
    </>
  );
}
