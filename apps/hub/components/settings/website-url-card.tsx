"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { Button } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { Input } from "@/components/ds/ui/field";
import { isAdminUser } from "@/lib/authz-shared";
import { useProject } from "@/hooks/use-project";
import { clearWebsiteUrlCache } from "@/hooks/use-website-url";

/**
 * The client's live website address (hosted on their own Netlify etc.; the
 * hub only previews and publishes). Feeds speed reports, campaign URLs, the
 * SEO base URL, and is auto-allowed for the embed scripts. Editable by
 * full-access collaborators (owner) or an admin; everyone else sees it
 * read-only. Reads the project row, so it never depends on GitHub.
 */
export function WebsiteUrlCard({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const project = useProject();
  const user = useCurrentUser().data?.user ?? null;

  const websiteUrl = project?.websiteUrl ?? null;
  const canEdit = isAdminUser(user) || project?.role === "full-access";

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
    <Card>
      <CardHeader title="Website address" divided />
      <div className="flex flex-col gap-3 px-6 py-5">
        <p className="text-[13px] text-dim">
          {canEdit
            ? "Where the live site is hosted, for example your Netlify domain. Publishing pushes your changes to GitHub and that host deploys them."
            : "Where the live site is hosted. Only the project owner can change this."}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="www.example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={!canEdit || !project}
            className="min-w-56 max-w-md flex-1"
          />
          {canEdit && (
            <Button
              variant="primary"
              disabled={!dirty || save.isPending}
              onClick={() => save.mutate({ projectId, websiteUrl: url.trim() || null })}
            >
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
