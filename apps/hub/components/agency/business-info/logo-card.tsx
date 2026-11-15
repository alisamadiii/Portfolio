"use client";

import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageUp, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import { LOGO_MAX_BYTES, LOGO_MAX_EDGE } from "@workspace/trpc/lib/logo-shared";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { Button } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { LetterTile } from "@/components/ds/ui/misc";
import { useProject } from "@/hooks/use-project";
import { useRouteProjectId } from "@/hooks/use-repo";
import { roleAtLeast } from "@/lib/authz-shared";
import { shrinkImage } from "@/lib/shrink-image";

const REJECTED: Record<string, string> = {
  svg: "SVG logos aren't supported. Use a PNG, JPG or WebP.",
  heic: "HEIC photos aren't supported. Use a PNG, JPG or WebP.",
  "not-image": "That file isn't an image.",
  decode: "We couldn't read that image.",
  "too-large": "That image is too detailed. Try a simpler or smaller logo.",
};

const toBase64 = async (blob: Blob) => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

/**
 * Business logo (Business info › Your business). Saves on pick, separate from
 * the step's Save button: the image is shrunk to a 512px WebP in the browser,
 * then stored in R2. Replacing it deletes the old file.
 */
export function LogoCard({ name }: { name: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const role = useProject()?.role ?? null;
  const canEdit = !!role && roleAtLeast(role, "content-editor");
  const input = useRef<HTMLInputElement>(null);

  const logo = useQuery(trpc.agency.businessInfo.logo.get.queryOptions({ projectId }));
  const logoUrl = logo.data?.logoUrl ?? null;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.agency.businessInfo.logo.pathKey() });
    // The project switcher shows the logo too.
    void queryClient.invalidateQueries({ queryKey: trpc.cms.repos.listMine.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.feedback.pathKey() });
  };

  const set = useMutation(
    trpc.agency.businessInfo.logo.set.mutationOptions({
      onSuccess: () => {
        toast.success("Logo saved.");
        refresh();
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const remove = useMutation(
    trpc.agency.businessInfo.logo.remove.mutationOptions({
      onSuccess: () => {
        toast.success("Logo removed.");
        refresh();
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const busy = set.isPending || remove.isPending;

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    const result = await shrinkImage(file, {
      maxEdge: LOGO_MAX_EDGE,
      maxBytes: LOGO_MAX_BYTES,
      allowGif: false,
    });
    if (!result.ok) {
      toast.error(REJECTED[result.reason] ?? "We couldn't use that image.");
      return;
    }
    set.mutate({ projectId, data: await toBase64(result.blob) });
  };

  return (
    <Card className="flex flex-wrap items-center gap-5 p-6">
      {logo.isPending ? (
        <Skeleton className="size-16 rounded-[12px]" />
      ) : (
        <LetterTile name={name || "?"} size={64} src={logoUrl} />
      )}
      <div className="flex min-w-[200px] flex-1 flex-col gap-1">
        <span className="text-sm font-semibold text-ink">Logo</span>
        <span className="text-[13px] text-dim">
          Shown on your review page and in Client Hub. PNG, JPG or WebP, square works best.
        </span>
      </div>
      {canEdit && (
        <div className="flex gap-2">
          <Button
            icon={<ImageUp className="size-4" />}
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {set.isPending ? "Uploading…" : logoUrl ? "Replace" : "Upload logo"}
          </Button>
          {logoUrl && (
            <Button
              variant="ghost"
              icon={<Trash2 className="size-4" />}
              disabled={busy}
              onClick={() => remove.mutate({ projectId })}
            >
              Remove
            </Button>
          )}
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              void onPick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </Card>
  );
}
