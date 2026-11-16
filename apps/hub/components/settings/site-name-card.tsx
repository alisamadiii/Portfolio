"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";

import { siteName } from "@/components/ds/layout/top-bar";
import { Button } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { Input } from "@/components/ds/ui/field";
import { useProject } from "@/hooks/use-project";

/** The site's display name (site switcher, Sites list). Empty falls back to the website host, then the repo. */
export function SiteNameCard({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const project = useProject();

  const current = project?.name ?? "";
  const fallback = siteName(project?.websiteUrl) || project?.repo || "";
  const [name, setName] = useState("");
  useEffect(() => setName(current), [current]);

  const save = useMutation(
    trpc.project.setName.mutationOptions({
      onSuccess: async () => {
        toast.success("Site name saved.");
        await queryClient.invalidateQueries();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const dirty = name.trim() !== current;

  return (
    <Card>
      <CardHeader title="Site name" divided />
      <div className="flex flex-col gap-3 px-6 py-5">
        <p className="text-[13px] text-dim">
          Shown in the site switcher and your Sites list. Leave it empty to use your website address.
        </p>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (dirty) save.mutate({ projectId, name: name.trim() || null });
          }}
        >
          <Input
            placeholder={fallback || "Your business name"}
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            disabled={!project}
            className="min-w-56 max-w-md flex-1"
          />
          <Button type="submit" variant="primary" disabled={!dirty || save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </form>
      </div>
    </Card>
  );
}
