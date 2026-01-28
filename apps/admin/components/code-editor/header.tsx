import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Spinner } from "@workspace/ui/components/spinner";

import { useTRPC } from "@workspace/trpc/client";
import { RouterOutputs } from "@workspace/trpc/routers/_app";

export const CodeEditorHeader = ({
  source,
}: {
  source: RouterOutputs["source"]["readById"];
}) => {
  const [title, setTitle] = useState(source.title);
  const router = useRouter();
  const trpc = useTRPC();
  const updateSource = useMutation(trpc.source.update.mutationOptions());

  return (
    <div className="bg-muted/50 flex h-10 items-center gap-4 border-b px-3">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => router.push("/code")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-7 w-48 border-none bg-transparent px-2 text-sm font-medium"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateSource.mutate({ id: source.id, title });
            }
          }}
        />
      </div>
      <div className="flex items-center gap-2">
        {updateSource.isPending && <Spinner />}
      </div>
    </div>
  );
};
