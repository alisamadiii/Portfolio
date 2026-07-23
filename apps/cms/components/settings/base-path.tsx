"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const [basePath, setBasePath] = useState("");
  const [initialBasePath, setInitialBasePath] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch(`/api/${owner}/${repo}/base-path`);
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.message || "Failed to load base path.");
        }
        if (active) {
          const value = payload?.data?.basePath ?? "";
          setBasePath(value);
          setInitialBasePath(value);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load base path.";
        if (active) toast.error(message);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [owner, repo]);

  const normalized = basePath.trim().replace(/^\/+|\/+$/g, "");
  const canSave = !isLoading && !isSaving && normalized !== initialBasePath;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/${owner}/${repo}/base-path`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basePath: normalized }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to update base path.");
      }

      const value = payload?.data?.basePath ?? "";
      setBasePath(value);
      setInitialBasePath(value);
      toast.success("Base path updated.");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update base path.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Base path</CardTitle>
        <CardDescription>
          For monorepos, point Pages CMS at the subfolder that holds your{" "}
          <code>.pages.yml</code> and content (e.g. <code>frontend</code>). All
          collection and media paths in your configuration are resolved relative
          to it. Leave empty to use the repository root.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
      <CardFooter>
        <Button
          size="sm"
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
