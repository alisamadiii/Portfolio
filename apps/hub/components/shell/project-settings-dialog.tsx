"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Spinner } from "@workspace/ui/components/spinner";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { isAdminUser } from "@/lib/authz-shared";
import { useProject } from "@/hooks/use-project";
import { clearWebsiteUrlCache } from "@/hooks/use-website-url";

/**
 * Website project settings, opened from the header gear. Holds the live
 * website URL (the client's own host, e.g. Netlify): it feeds speed reports
 * and the SEO base URL. Editable by the project owner or an admin; everyone
 * else sees it read-only.
 */
export function ProjectSettingsDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const project = useProject();
  const user = useCurrentUser().data?.user ?? null;

  const snapshot = useQuery(
    trpc.cms.repos.getSnapshot.queryOptions(
      { projectId },
      { enabled: !!projectId && open }
    )
  );
  const websiteUrl = snapshot.data?.websiteUrl ?? null;
  const canEdit = isAdminUser(user) || !!snapshot.data?.isOwner;

  const [url, setUrl] = useState("");
  useEffect(() => {
    if (open) setUrl(websiteUrl ?? "");
  }, [open, websiteUrl]);

  const save = useMutation(
    trpc.project.setWebsiteUrl.mutationOptions({
      onSuccess: async () => {
        toast.success("Project settings saved.");
        clearWebsiteUrlCache(project?.owner, project?.repo);
        onOpenChange(false);
        await queryClient.invalidateQueries();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const dirty = url.trim() !== (websiteUrl ?? "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Project settings</DialogTitle>
          <DialogDescription>
            Publishing pushes your changes to GitHub and the site&apos;s host
            deploys them.
          </DialogDescription>
        </DialogHeader>
        {!snapshot.data ? (
          <div className="flex justify-center py-8">
            <Spinner className="text-muted-foreground size-5" />
          </div>
        ) : (
          <form
            id="project-settings"
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canEdit || !dirty) return;
              save.mutate({ projectId, websiteUrl: url.trim() || null });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="project-website-url">Website URL</Label>
              <Input
                id="project-website-url"
                placeholder="www.example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={!canEdit}
              />
              <p className="text-muted-foreground text-[12.5px]">
                {canEdit
                  ? "Where the live site is hosted, for example the client's Netlify domain."
                  : "Where the live site is hosted. Only the project owner can change this."}
              </p>
            </div>
          </form>
        )}
        {canEdit && (
          <DialogFooter>
            <Button
              type="submit"
              form="project-settings"
              isLoading={save.isPending}
              disabled={!dirty || !snapshot.data}
            >
              Save
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
