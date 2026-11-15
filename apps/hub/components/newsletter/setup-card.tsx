"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";

import { Button } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { IconTile } from "@/components/ds/ui/misc";

import { useNewsletter } from "./use-newsletter";

/** Shown until the project has its own newsletter workspace. */
export function SetupCard() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { projectId, canManage } = useNewsletter();
  const setup = useMutation(
    trpc.newsletter.setup.mutationOptions({
      onSuccess: () => {
        toast.success("Newsletter is ready");
        queryClient.invalidateQueries({ queryKey: trpc.newsletter.pathKey() });
      },
      onError: (e) => toast.error(e.message),
    })
  );

  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <IconTile>
        <Mail className="size-5" strokeWidth={1.8} />
      </IconTile>
      <h2 className="mt-1 text-base font-semibold">Set up your newsletter</h2>
      <p className="max-w-[440px] text-[13px] leading-normal text-dim">
        We&apos;ll create a private newsletter space for this website. Your subscribers, campaigns
        and stats stay separate from everyone else&apos;s.
      </p>
      {canManage ? (
        <Button
          variant="primary"
          className="mt-2"
          disabled={setup.isPending}
          onClick={() => setup.mutate({ projectId })}
        >
          {setup.isPending ? "Setting up…" : "Set up newsletter"}
        </Button>
      ) : (
        <p className="mt-1 text-[13px] text-dim">Ask the project owner to set it up.</p>
      )}
    </Card>
  );
}
