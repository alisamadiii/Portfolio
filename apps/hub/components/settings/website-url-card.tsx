"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Spinner } from "@workspace/ui/components/spinner";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { isAdminUser } from "@/lib/authz-shared";
import { useProject } from "@/hooks/use-project";
import { clearWebsiteUrlCache } from "@/hooks/use-website-url";

/**
 * The client's live website address (hosted on their own Netlify etc.; the
 * hub only previews and publishes). Feeds speed reports, campaign URLs, the
 * SEO base URL, and is auto-allowed for the embed scripts. Editable by the
 * project owner or an admin; everyone else sees it read-only.
 */
export function WebsiteUrlCard({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const project = useProject();
  const user = useCurrentUser().data?.user ?? null;

  const snapshot = useQuery(
    trpc.cms.repos.getSnapshot.queryOptions({ projectId }, { enabled: !!projectId })
  );
  const websiteUrl = snapshot.data?.websiteUrl ?? null;
  const canEdit = isAdminUser(user) || !!snapshot.data?.isOwner;

  const [url, setUrl] = useState("");
  useEffect(() => setUrl(websiteUrl ?? ""), [websiteUrl]);

  const save = useMutation(
    trpc.project.setWebsiteUrl.mutationOptions({
      onSuccess: async () => {
        toast.success("Website URL saved.");
        clearWebsiteUrlCache(project?.owner, project?.repo);
        await queryClient.invalidateQueries();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const dirty = url.trim() !== (websiteUrl ?? "");

  return (
    <div className="bg-card rounded-lg border">
      <div className="border-b p-4">
        <h3 className="text-[16px] font-extrabold tracking-tight">
          Website URL
        </h3>
        <p className="text-muted-foreground mt-1 text-[13px]">
          {canEdit
            ? "Where the live site is hosted, for example the client's Netlify domain. Publishing pushes your changes to GitHub and that host deploys them."
            : "Where the live site is hosted. Only the project owner can change this."}
        </p>
      </div>
      {!snapshot.data ? (
        <div className="flex justify-center py-10">
          <Spinner className="text-muted-foreground size-5" />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 p-4">
          <Input
            placeholder="www.example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={!canEdit}
            className="min-w-56 flex-1"
          />
          {canEdit && (
            <Button
              isLoading={save.isPending}
              disabled={!dirty}
              onClick={() =>
                save.mutate({ projectId, websiteUrl: url.trim() || null })
              }
            >
              Save
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
