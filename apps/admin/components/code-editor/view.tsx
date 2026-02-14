import React from "react";
import { useCodeEditor } from "@/context/code-editor";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Spinner } from "@workspace/ui/components/spinner";
import { Textarea } from "@workspace/ui/components/textarea";

import { useTRPC } from "@workspace/trpc/client";
import { RouterOutputs } from "@workspace/trpc/routers/_app";

import { UpdateFormSource } from "./update-source-form";

export const CodeEditorView = ({
  source,
}: {
  source: RouterOutputs["admin"]["sources"]["readById"];
}) => {
  const { selectedTab, setSelectedTab } = useCodeEditor();

  const selectedFile = source.files.find((f) => f.id === selectedTab);

  const trpc = useTRPC();
  const updateFile = useMutation(
    trpc.admin.sources.file.update.mutationOptions()
  );

  return (
    <div key={selectedTab} className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden">
        {selectedTab === "media" ? (
          <div className="h-full overflow-auto p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium">Upload Media</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTab(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : selectedFile ? (
          <div className="flex h-full flex-col">
            <div className="flex h-8 items-center justify-between border-b px-3">
              <span className="text-muted-foreground text-xs">
                {selectedFile?.path ? `${selectedFile.path}/` : ""}
                {selectedFile?.filename}
              </span>
              <div className="flex items-center gap-2">
                <p className="text-xs">
                  {updateFile.isPending ? <Spinner /> : "Save (Cmd+S)"}
                </p>
              </div>
            </div>

            <div className="relative flex-1">
              <Textarea
                defaultValue={selectedFile?.content || ""}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                    e.preventDefault();
                    updateFile.mutate({
                      id: selectedFile.id,
                      content: (e.target as HTMLTextAreaElement).value,
                    });
                  }
                }}
                className="bg-background absolute inset-0 resize-none rounded-none border-none font-mono text-sm leading-6 focus-visible:ring-0"
                style={{ tabSize: 2 }}
              />
            </div>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center">
            <UpdateFormSource />
          </div>
        )}
      </div>
    </div>
  );
};
