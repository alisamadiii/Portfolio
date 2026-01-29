"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";

import { Button } from "@workspace/ui/components/button";

import { useTRPC } from "@workspace/trpc/client";

import { CodeEditorHeader } from "@/components/code-editor/header";
import { Sidebar } from "@/components/code-editor/sidebar";
import { CodeEditorView } from "@/components/code-editor/view";

export default function EditSourcePage() {
  const params = useParams();
  const router = useRouter();
  const trpc = useTRPC();
  const sourceId = params.id as string;

  const sourceQuery = useQuery(
    trpc.admin.sources.readById.queryOptions(sourceId)
  );

  if (sourceQuery.isPending) {
    return (
      <div className="bg-background flex h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (sourceQuery.isError || !sourceQuery.data) {
    return (
      <div className="bg-background flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-destructive">Failed to load source</p>
        <Button variant="outline" onClick={() => router.push("/code")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background dark text-foreground flex h-screen flex-col">
      <CodeEditorHeader source={sourceQuery.data} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar source={sourceQuery.data} />
        <CodeEditorView source={sourceQuery.data} />
      </div>
    </div>
  );
}
