"use client";

import { useState } from "react";
import { Rocket } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Spinner } from "@workspace/ui/components/spinner";
import { toast } from "sonner";

export const PublishButton = ({
  projectId,
  getDirtyFiles,
}: {
  projectId: string;
  getDirtyFiles: () => Promise<{ path: string; content: string }[]>;
}) => {
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const files = await getDirtyFiles();
      if (files.length === 0) {
        toast.info("No changes to publish");
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/api/agent/merge`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          files,
          action: "push-live",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Publish failed");
      }

      toast.success("Changes published successfully!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to publish changes"
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" disabled={publishing}>
          {publishing ? <Spinner /> : <Rocket className="size-4" />}
          Publish
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Publish to live?</AlertDialogTitle>
          <AlertDialogDescription>
            This will push all your changes to the production website. Visitors
            will see the updates immediately.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handlePublish}>
            Publish Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
