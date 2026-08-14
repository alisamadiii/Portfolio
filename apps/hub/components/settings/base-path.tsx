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
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

type BasePathProps = {
  owner: string;
  repo: string;
};

export function BasePath({ owner, repo }: BasePathProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const basePathUrl = `/api/${owner}/${repo}/base-path`;
  const [basePath, setBasePath] = useState("");
  const [initialBasePath, setInitialBasePath] = useState("");

  // Edit buffer — the query must not refetch and clobber unsaved edits.
  const basePathQuery = useQuery({
    queryKey: [basePathUrl],
    queryFn: async ({ signal }) => {
      const response = await fetch(basePathUrl, { signal });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to load base path.");
      }
      return payload;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const isLoading = basePathQuery.isPending;

  useEffect(() => {
    if (basePathQuery.data === undefined) return;
    const value = basePathQuery.data?.data?.basePath ?? "";
    setBasePath(value);
    setInitialBasePath(value);
  }, [basePathQuery.data]);

  useEffect(() => {
    if (basePathQuery.error) {
      toast.error(basePathQuery.error.message || "Failed to load base path.");
    }
  }, [basePathQuery.error]);

  const normalized = basePath.trim().replace(/^\/+|\/+$/g, "");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(basePathUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basePath: normalized }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to update base path.");
      }
      return payload;
    },
    onSuccess: (payload) => {
      const value = payload?.data?.basePath ?? "";
      setBasePath(value);
      setInitialBasePath(value);
      queryClient.setQueryData([basePathUrl], payload);
      toast.success("Base path updated.");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update base path.");
    },
  });
  const isSaving = saveMutation.isPending;
  const canSave = !isLoading && !isSaving && normalized !== initialBasePath;

  const handleSave = () => saveMutation.mutate();

  return (
    <Card className="bg-background shadow-xs mb-6 gap-4 rounded-xl border py-5 ring-0 md:py-6">
      <CardHeader className="px-5 md:px-6">
        <CardTitle className="text-sm font-semibold">Base path</CardTitle>
        <CardDescription>
          For monorepos, point Client Hub at the subfolder that holds your{" "}
          <code>.pages.yml</code> and content (e.g. <code>frontend</code>). All
          collection and media paths in your configuration are resolved relative
          to it. Leave empty to use the repository root.
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
            <Label htmlFor="base-path">Folder</Label>
            <Input
              id="base-path"
              name="base-path"
              value={basePath}
              placeholder="frontend"
              onChange={(event) => setBasePath(event.target.value)}
              maxLength={255}
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
          Save base path
          {isSaving && <Loader className="ml-2 h-4 w-4 animate-spin" />}
        </Button>
      </CardFooter>
    </Card>
  );
}
