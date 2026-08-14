"use client";

import { useMemo, useState } from "react";
import { useConfig } from "@/contexts/config-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@workspace/trpc/client";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";

import { handleCmsError } from "@/lib/trpc-errors";
import { getSchemaByName } from "@workspace/cms-core/schema";
import {
  getRelativePath,
  joinPathSegments,
  normalizePath,
} from "@workspace/cms-core/utils/file";

export function FileRename({
  isOpen,
  onOpenChange,
  path,
  type,
  sha,
  name,
  onRename,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  path: string;
  type: "collection" | "file" | "media" | "settings";
  sha: string;
  name?: string;
  onRename?: (path: string, newPath: string) => void;
}) {
  const { config } = useConfig();
  if (!config) throw new Error(`Configuration not found.`);

  if (!name) throw new Error("Name is required for FileRename");

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const renameFileMutation = useMutation(
    trpc.cms.files.rename.mutationOptions()
  );

  const schema = getSchemaByName(config.object, name, type);
  if (!schema) throw new Error(`Schema not found for ${name}.`);

  const rootPath = useMemo(
    () => (type === "media" ? schema.input : schema.path),
    [type, schema.input, schema.path]
  );
  const normalizedPath = useMemo(() => normalizePath(path), [path]);
  const relativePath = useMemo(
    () => getRelativePath(normalizedPath, rootPath),
    [normalizedPath, rootPath]
  );

  const [newRelativePath, setNewRelativePath] = useState(relativePath);

  const handleRename = async () => {
    try {
      const newPath = joinPathSegments([
        rootPath,
        normalizePath(newRelativePath),
      ]);

      const renamePromise = renameFileMutation
        .mutateAsync({
          owner: config.owner,
          repo: config.repo,
          branch: config.branch,
          path: normalizedPath,
          type: type === "media" ? "media" : "content",
          name,
          newPath,
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
                name,
              }),
            });
          }
          // Mark stale only — onRename swaps the observer to the new path
          // (and drops the old key), so an eager refetch here would 404.
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

      toast.promise(renamePromise, {
        loading: `Renaming "${path}" to "${newPath}"`,
        success: (data) => {
          if (onRename) onRename(path, newPath);
          return data.message;
        },
        error: (error: unknown) =>
          handleCmsError(error, "Failed to rename file"),
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename file</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <Input
          defaultValue={relativePath}
          onChange={(e) => setNewRelativePath(e.target.value)}
        />
        <DialogFooter className="max-sm:gap-y-2">
          <DialogClose
            render={
              <Button type="button" variant="outline">
                Cancel
              </Button>
            }
          />
          <DialogClose
            render={
              <Button type="submit" onClick={handleRename}>
                Rename
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
