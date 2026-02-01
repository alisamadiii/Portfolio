import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Lock, Unlock } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Spinner } from "@workspace/ui/components/spinner";

import { queryClient, useTRPC } from "@workspace/trpc/client";
import { RouterOutputs } from "@workspace/trpc/routers/_app";

export const CodeEditorHeader = ({
  source,
}: {
  source: RouterOutputs["admin"]["sources"]["readById"];
}) => {
  const [title, setTitle] = useState(source.title);
  const router = useRouter();
  const trpc = useTRPC();
  const updateSource = useMutation(trpc.admin.sources.update.mutationOptions());
  const updateSourcePrivate = useMutation(
    trpc.admin.sources.update.mutationOptions()
  );

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
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-7 w-48 border-none bg-transparent px-2 text-sm font-medium"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateSource.mutate({ id: source.id, title });
            }
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() =>
            updateSourcePrivate.mutate(
              {
                id: source.id,
                isPrivate: !source.isPrivate,
              },
              {
                onSuccess: () => {
                  queryClient.setQueryData(
                    trpc.admin.sources.readById.queryKey(source.id),
                    {
                      ...source,
                      isPrivate: !source.isPrivate,
                    }
                  );
                },
              }
            )
          }
        >
          {updateSourcePrivate.isPending ? (
            <Spinner className="size-4" />
          ) : source.isPrivate ? (
            <Lock className="size-4 text-red-500" />
          ) : (
            <Unlock className="size-4 text-green-500" />
          )}
        </Button>
      </div>
      <div className="flex items-center gap-2">
        {updateSource.isPending && <Spinner />}
      </div>
    </div>
  );
};
