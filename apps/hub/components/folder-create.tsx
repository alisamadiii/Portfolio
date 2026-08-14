"use client";

import { useState } from "react";
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
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";

import { handleCmsError } from "@/lib/trpc-errors";
import { joinPathSegments, normalizePath } from "@workspace/cms-core/utils/file";

type FolderCreateResult = {
  path: string;
  [key: string]: unknown;
};

const FolderCreate = ({
  children,
  path,
  type,
  name,
  onCreate,
}: {
  children: React.ReactElement<{ onClick: () => void }>;
  path: string;
  type: "content" | "media";
  name?: string;
  onCreate?: (entry: FolderCreateResult) => void;
}) => {
  const { config } = useConfig();
  if (!config) throw new Error(`Configuration not found.`);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const saveFileMutation = useMutation(trpc.cms.files.save.mutationOptions());

  const [open, setOpen] = useState(false);
  const [folderPath, setFolderPath] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    const normalizedFolderInput = normalizePath(folderPath.trim());
    if (!normalizedFolderInput) {
      toast.error("Folder name is required.");
      return;
    }

    const fullNewPath = joinPathSegments([
      normalizePath(path),
      normalizedFolderInput,
    ]);

    setIsSubmitting(true);
    try {
      const createPromise = saveFileMutation
        .mutateAsync({
          owner: config.owner,
          repo: config.repo,
          branch: config.branch,
          path: `${fullNewPath}/.gitkeep`,
          type,
          name,
          content: "",
          onConflict: "error",
        })
        .then((result) => {
          if (type === "media") {
            void queryClient.invalidateQueries({
              queryKey: trpc.cms.media.list.queryKey(),
            });
          } else if (name) {
            void queryClient.invalidateQueries({
              queryKey: trpc.cms.collections.list.queryKey({
                owner: config.owner,
                repo: config.repo,
                branch: config.branch,
                name,
              }),
            });
          }
          return result;
        })
        .catch((error: unknown) => {
          const code =
            typeof error === "object" && error !== null
              ? (error as { data?: { code?: string } }).data?.code
              : undefined;
          if (code === "CONFLICT") {
            throw new Error(`Folder \"${fullNewPath}\" already exists.`);
          }
          throw new Error(handleCmsError(error, "Failed to create folder"));
        });

      await toast.promise(createPromise, {
        loading: `Creating folder "${fullNewPath}"`,
        success: `Folder "${fullNewPath}" created successfully.`,
        error: (error: any) => error.message,
      });

      const result = await createPromise;
      if (onCreate) onCreate(result.data as FolderCreateResult);
      setFolderPath("");
      setOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setFolderPath("");
          setIsSubmitting(false);
        }
      }}
    >
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a folder</DialogTitle>
          <DialogDescription>
            Choose a name for the folder to create
            {path ? ` under "${normalizePath(path)}"` : null}.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!isSubmitting) await handleCreate();
          }}
          className="space-y-4"
        >
          <Input
            autoFocus
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
          />
          <DialogFooter>
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={isSubmitting || !folderPath.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export { FolderCreate };
