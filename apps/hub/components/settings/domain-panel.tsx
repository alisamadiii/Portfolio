"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

import { useTRPC } from "@workspace/trpc/client";

import { useConfig } from "@/contexts/config-context";
import { Globe } from "@/components/icon";

/** Site Settings › Domain — set the project's live website URL. */
export function DomainPanel() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { config } = useConfig();
  const owner = config?.owner ?? "";
  const repo = config?.repo ?? "";

  const snapshot = useQuery(
    trpc.cms.repos.getSnapshot.queryOptions({ repo }, { enabled: !!repo })
  );
  const current = snapshot.data?.websiteUrl ?? "";
  const [value, setValue] = useState("");
  useEffect(() => setValue(current), [current]);

  const save = useMutation(
    trpc.project.setWebsiteUrl.mutationOptions({
      onSuccess: async () => {
        toast.success("Website URL saved.");
        await queryClient.invalidateQueries();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  return (
    <div className="mx-auto w-full max-w-screen-md p-6">
      <div className="mb-1.5 flex items-center gap-2">
        <Globe className="size-5" />
        <h2 className="text-lg font-semibold tracking-tight">Domain</h2>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">
        Your site's live website URL. It's shown across the hub and used for the
        canvas preview and the SEO base URL.
      </p>

      <div className="max-w-md space-y-1.5">
        <Label htmlFor="website-url">Website URL</Label>
        <Input
          id="website-url"
          placeholder="example.com"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim() !== current.trim()) {
              save.mutate({ owner, repo, websiteUrl: value });
            }
          }}
        />
        <p className="text-muted-foreground text-[12.5px]">
          Enter a domain like <span className="font-medium">example.com</span> —
          we'll store it as <span className="font-medium">https://…</span>.
        </p>
      </div>

      <div className="mt-5 max-w-md">
        <Button
          isLoading={save.isPending}
          disabled={value.trim() === current.trim()}
          onClick={() => save.mutate({ owner, repo, websiteUrl: value })}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
