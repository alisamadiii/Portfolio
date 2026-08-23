"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConfig } from "@/contexts/config-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@workspace/trpc/client";
import { Loader as LucideLoader } from "@/components/icon";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";

import { handleCmsError } from "@/lib/trpc-errors";
import { getSchemaByName, initializeState } from "@workspace/cms-core/schema";
import { normalizePath } from "@workspace/cms-core/utils/file";

const EmptyCreate = ({
  children,
  type,
  name,
  onCreate,
}: {
  children: React.ReactNode;
  type: "content" | "media" | "settings";
  name?: string;
  onCreate?: (path: string) => void;
}) => {
  const { config } = useConfig();
  if (!config) throw new Error(`Configuration not found.`);

  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const saveFileMutation = useMutation(trpc.cms.files.save.mutationOptions());
  const [isCreating, setIsCreating] = useState(false);

  let path = "";
  let content: string | Record<string, any> = "";
  let toCreate = "";
  let redirectTo = `/${config.repo}`;

  if (type === "settings") {
    path = ".pages.yml";
    toCreate = "configuration file";
    redirectTo = `${redirectTo}/configuration`;
  } else if (type === "content" || type === "media") {
    if (!name) throw new Error(`"name" is required.`);
    const schema = getSchemaByName(config.object, name, type);
    if (!schema) throw new Error(`Schema not found for ${name}.`);

    if (type === "media") {
      path = `${schema.input}/.gitkeep`;
      toCreate = "media folder";
      redirectTo = `${redirectTo}/media/${schema.name}`;
    } else {
      if (schema.type === "file") {
        path = schema.path;
        toCreate = "file";
        if (schema.list) {
          // Root-level list files must serialize as an array.
          content = [];
        } else if (schema.fields && schema.fields.length) {
          // TODO: this will still not pass validation for patterns/required fields
          content = initializeState(schema.fields, {});
        }
      } else {
        path = `${schema.path}/.gitkeep`;
        toCreate = "collection folder";
      }
      redirectTo = `${redirectTo}/${schema.type}/${schema.name}`;
    }
  } else {
    throw new Error(`Invalid type "${type}".`);
  }

  const handleCreate = async () => {
    if (isCreating) return;
    setIsCreating(true);
    const toastId = toast.loading(`Creating ${toCreate}...`);

    const normalizedPath = normalizePath(path);
    try {
      await saveFileMutation.mutateAsync({
        owner: config.owner,
        repo: config.repo,
        branch: config.branch,
        path: normalizedPath,
        type,
        name,
        content,
        ...(path.endsWith("/.gitkeep")
          ? { onConflict: "error" as const }
          : {}),
      });

      if (type === "media") {
        void queryClient.invalidateQueries({
          queryKey: trpc.cms.media.list.queryKey(),
        });
      } else if (type === "content" && name) {
        void queryClient.invalidateQueries({
          queryKey: trpc.cms.collections.list.queryKey({
            owner: config.owner,
            repo: config.repo,
            branch: config.branch,
            name,
          }),
        });
      }
      void queryClient.invalidateQueries({
        queryKey: trpc.cms.entries.get.queryKey({
          owner: config.owner,
          repo: config.repo,
          branch: config.branch,
          path: normalizedPath,
        }),
      });

      toast.loading(`Opening ${toCreate}...`, { id: toastId });
      onCreate?.(normalizedPath);
      // Navigate immediately so destination route can render its loading skeleton.
      router.push(`${redirectTo}?empty-created`);
      router.refresh();
      toast.success(`Created ${toCreate}. Opening...`, { id: toastId });
    } catch (error) {
      setIsCreating(false);
      toast.error(handleCmsError(error, `Failed to create ${toCreate}.`), {
        id: toastId,
      });
    }
  };

  return (
    <Button type="button" onClick={handleCreate} disabled={isCreating}>
      {isCreating ? (
        <span className="inline-flex items-center gap-x-2">
          Creating...
          <LucideLoader className="h-4 w-4 animate-spin" />
        </span>
      ) : (
        children
      )}
    </Button>
  );
};

export { EmptyCreate };
