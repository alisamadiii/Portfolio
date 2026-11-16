"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { useTRPC } from "@workspace/trpc/client";

import { Button } from "@/components/ds/ui/button";
import { Field, Input } from "@/components/ds/ui/field";
import { handleCmsError } from "@/lib/trpc-errors";

const ACCOUNT_LABELS = { agency: "Agency Netlify", owner: "Owner's Netlify" } as const;

/**
 * Admin only: pin an existing Netlify site (agency Netlify or the owner's
 * connected Netlify) to the project, instead of creating one on first publish.
 */
export function LinkNetlifyDialog({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const sites = useQuery(trpc.netlify.linkableSites.queryOptions({ projectId }, { enabled: open }));
  const link = useMutation(
    trpc.netlify.linkSite.mutationOptions({
      onSuccess: async ({ name }) => {
        await queryClient.invalidateQueries();
        toast.success(`Linked to ${name} on Netlify.`);
        setOpen(false);
        setSelected(null);
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't link the Netlify project.")),
    })
  );

  const query = search.trim().toLowerCase();
  const filtered = (sites.data ?? []).filter(
    (s) =>
      !query ||
      s.name.toLowerCase().includes(query) ||
      s.url.toLowerCase().includes(query) ||
      s.customDomain?.toLowerCase().includes(query)
  );
  const choice = sites.data?.find((s) => `${s.account}:${s.id}` === selected) ?? null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (link.isPending) return;
        setOpen(next);
        if (!next) setSelected(null);
      }}
    >
      <Button icon={<Link2 className="size-[15px]" />} onClick={() => setOpen(true)}>
        Link to a Netlify project
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link to a Netlify project</DialogTitle>
          <DialogDescription>
            Publishing deploys to the site you pick instead of creating a new one.
          </DialogDescription>
        </DialogHeader>

        <Field label="Search">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Site name or domain"
            autoComplete="off"
          />
        </Field>

        <div className="flex max-h-[320px] flex-col gap-1 overflow-y-auto">
          {sites.isPending ? (
            <>
              <Skeleton className="h-12 rounded-control" />
              <Skeleton className="h-12 rounded-control" />
              <Skeleton className="h-12 rounded-control" />
            </>
          ) : sites.isError ? (
            <p className="text-[13px] text-danger">
              {handleCmsError(sites.error, "Couldn't load Netlify projects.")}
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-[13px] text-dim">No Netlify projects found.</p>
          ) : (
            filtered.map((s) => {
              const key = `${s.account}:${s.id}`;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  className={
                    selected === key
                      ? "flex items-center justify-between gap-3 rounded-control border border-coral bg-coral-soft px-3 py-2 text-left"
                      : "flex items-center justify-between gap-3 rounded-control border border-line px-3 py-2 text-left hover:bg-canvas"
                  }
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-ink">{s.name}</span>
                    <span className="truncate text-[13px] text-dim">
                      {s.customDomain ?? s.url.replace(/^https?:\/\//, "")}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px] text-dim">{ACCOUNT_LABELS[s.account]}</span>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={link.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!choice || link.isPending}
            onClick={() =>
              choice && link.mutate({ projectId, siteId: choice.id, account: choice.account })
            }
          >
            {link.isPending ? "Linking…" : "Link project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
