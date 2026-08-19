"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { TextField } from "@/components/ui/mui";

import { useTRPC } from "@workspace/trpc/client";

type WebsiteUrlProps = {
  owner: string;
  repo: string;
};

export function WebsiteUrl({ owner, repo }: WebsiteUrlProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [initialWebsiteUrl, setInitialWebsiteUrl] = useState("");

  // Edit buffer — the query must not refetch and clobber unsaved edits.
  const websiteUrlQuery = useQuery(
    trpc.cms.settings.getWebsiteUrl.queryOptions(
      { owner, repo },
      { staleTime: Infinity, refetchOnWindowFocus: false }
    )
  );
  const isLoading = websiteUrlQuery.isPending;

  useEffect(() => {
    if (websiteUrlQuery.data === undefined) return;
    const value = websiteUrlQuery.data.websiteUrl ?? "";
    setWebsiteUrl(value);
    setInitialWebsiteUrl(value);
  }, [websiteUrlQuery.data]);

  useEffect(() => {
    if (websiteUrlQuery.error) {
      toast.error(
        websiteUrlQuery.error.message || "Failed to load website URL."
      );
    }
  }, [websiteUrlQuery.error]);

  const normalized = websiteUrl.trim();

  const saveMutation = useMutation(
    trpc.cms.settings.setWebsiteUrl.mutationOptions({
      onSuccess: (payload) => {
        const value = payload.websiteUrl ?? "";
        setWebsiteUrl(value);
        setInitialWebsiteUrl(value);
        queryClient.setQueryData(
          trpc.cms.settings.getWebsiteUrl.queryKey({ owner, repo }),
          { websiteUrl: value || null }
        );
        toast.success("Website URL updated.");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update website URL.");
      },
    })
  );
  const isSaving = saveMutation.isPending;
  const canSave = !isLoading && !isSaving && normalized !== initialWebsiteUrl;

  const handleSave = () =>
    saveMutation.mutate({ owner, repo, url: normalized });

  return (
    <Card className="bg-background shadow-xs mb-6 gap-4 rounded-xl border py-5 ring-0 md:py-6">
      <CardHeader className="px-5 md:px-6">
        <CardTitle className="text-sm font-semibold">Website URL</CardTitle>
        <CardDescription>
          The live URL of this project's website (e.g.{" "}
          <code>https://acme.com</code>). Powers the website status card and the
          project preview on the home page.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 md:px-6">
        <form
          className="w-full"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSave) void handleSave();
          }}
        >
          <div className="grid w-full items-center gap-2">
            <TextField
              id="website-url"
              name="website-url"
              label="URL"
              value={websiteUrl}
              placeholder="https://acme.com"
              onChange={(event) => setWebsiteUrl(event.target.value)}
              slotProps={{ htmlInput: { maxLength: 2048 } }}
              disabled={isLoading || isSaving}
            />
          </div>
        </form>
      </CardContent>
      <CardFooter className="px-5 md:px-6">
        <Button
          className="ml-auto"
          onClick={() => void handleSave()}
          disabled={!canSave}
        >
          Save website URL
          {isSaving && <Loader className="ml-2 h-4 w-4 animate-spin" />}
        </Button>
      </CardFooter>
    </Card>
  );
}
