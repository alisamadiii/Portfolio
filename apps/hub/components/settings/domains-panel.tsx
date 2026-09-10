"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Globe, MoreHorizontal } from "@/components/icon";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Spinner } from "@workspace/ui/components/spinner";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { useConfig } from "@/contexts/config-context";

import { PanelError } from "@/components/settings/panel-error";

type DomainList = RouterOutputs["domain"]["list"];
type DomainRow = DomainList["domains"][number];

// The primary domain (or the first one) drives the derived site URL — mirrors
// the server's pickPrimaryDomain so cache writes stay in sync without a refetch.
const primaryUrl = (domains: DomainRow[]): string | null => {
  const primary = domains.find((d) => d.isPrimary) ?? domains[0];
  return primary ? `https://${primary.domain}` : null;
};

// ─── Panel (in-shell, rendered from Site Settings › Domain) ──────
// Plain CRUD over the project's domains. The hub DB is the source of truth;
// domains are metadata the client points at their own host (no DNS setup here).

export const DomainsPanel = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { config } = useConfig();

  const owner = config?.owner;
  const repo = config?.repo;

  const listOptions = trpc.domain.list.queryOptions(
    { owner: owner ?? "", repo: repo ?? "" },
    { enabled: !!owner && !!repo }
  );
  const { data, isLoading, error, refetch, isRefetching } =
    useQuery(listOptions);

  // Every mutation returns the fresh domain list — write it straight into the
  // list cache (with the recomputed site URL) so the UI updates without a refetch.
  const setDomains = (domains: DomainRow[]) =>
    queryClient.setQueryData(
      listOptions.queryKey,
      (old: DomainList | undefined) =>
        old ? { ...old, domains, websiteUrl: primaryUrl(domains) } : old
    );

  if (!owner || !repo) return null;

  return (
    <div className="mx-auto w-full max-w-screen-md p-6">
      <div className="mb-6">
        <h2 className="text-[22px] font-extrabold tracking-tight">Domains</h2>
        <p className="text-muted-foreground mt-1 text-[14px]">
          The domains your website is served on.
        </p>
      </div>

      {error ? (
        <PanelError
          title="Failed to load domains"
          message={error.message}
          onRetry={() => void refetch()}
          retrying={isRefetching}
        />
      ) : isLoading || !data ? (
        <div className="flex justify-center py-24">
          <Spinner className="text-muted-foreground size-6" />
        </div>
      ) : (
        <div className="space-y-6">
          <AddDomainForm owner={owner} repo={repo} onAdded={setDomains} />

          <div className="bg-card divide-y rounded-lg border">
            {data.domains.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="bg-accent text-accent-foreground mx-auto grid size-12 place-items-center rounded-full">
                  <Globe className="size-6" />
                </div>
                <p className="text-muted-foreground mx-auto mt-4 max-w-[380px] text-[14.5px]">
                  No domains yet. Add your first one above.
                </p>
              </div>
            ) : (
              data.domains.map((row) => (
                <DomainItem
                  key={row.domain}
                  owner={owner}
                  repo={repo}
                  row={row}
                  onChanged={setDomains}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Add domain ──────────────────────────────────────────────────

const AddDomainForm = ({
  owner,
  repo,
  onAdded,
}: {
  owner: string;
  repo: string;
  onAdded: (domains: DomainRow[]) => void;
}) => {
  const trpc = useTRPC();
  const [value, setValue] = useState("");

  const addMutation = useMutation(
    trpc.domain.add.mutationOptions({
      onSuccess: ({ domains }) => {
        onAdded(domains);
        setValue("");
        toast.success("Domain added.");
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const domain = value.trim().toLowerCase();
  const canAdd = domain.includes(".") && !addMutation.isPending;

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (canAdd) addMutation.mutate({ owner, repo, domain });
      }}
    >
      <Input
        value={value}
        placeholder="acme.com"
        onChange={(event) => setValue(event.target.value)}
        disabled={addMutation.isPending}
      />
      <Button
        type="submit"
        className="rounded-full px-5"
        disabled={!canAdd}
        isLoading={addMutation.isPending}
      >
        Add
      </Button>
    </form>
  );
};

// ─── Domain row ──────────────────────────────────────────────────

const DomainItem = ({
  owner,
  repo,
  row,
  onChanged,
}: {
  owner: string;
  repo: string;
  row: DomainRow;
  onChanged: (domains: DomainRow[]) => void;
}) => {
  const trpc = useTRPC();
  const [editOpen, setEditOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const setPrimaryMutation = useMutation(
    trpc.domain.setPrimary.mutationOptions({
      onSuccess: ({ domains }) => {
        onChanged(domains);
        toast.success(`${row.domain} is now the primary domain.`);
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const removeMutation = useMutation(
    trpc.domain.remove.mutationOptions({
      onSuccess: ({ domains }) => {
        onChanged(domains);
        setRemoveOpen(false);
        toast.success(`${row.domain} removed.`);
      },
      onError: (error) => toast.error(error.message),
    })
  );

  return (
    <div>
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <a
              href={`https://${row.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 truncate text-[15px] font-bold hover:underline"
            >
              {row.domain}
              <ExternalLink className="text-muted-foreground size-3.5 shrink-0" />
            </a>
            {row.isPrimary && (
              <Badge variant="secondary" className="shrink-0">
                Primary
              </Badge>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {!row.isPrimary && (
              <DropdownMenuItem
                disabled={setPrimaryMutation.isPending}
                onClick={() =>
                  setPrimaryMutation.mutate({ owner, repo, domain: row.domain })
                }
              >
                Make primary
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setRemoveOpen(true)}
            >
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <EditDomainDialog
        owner={owner}
        repo={repo}
        row={row}
        open={editOpen}
        onOpenChange={setEditOpen}
        onChanged={onChanged}
      />

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {row.domain}?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed from this project. DNS records at your registrar
              are not touched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                removeMutation.mutate({ owner, repo, domain: row.domain })
              }
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─── Edit dialog (rename the domain) ─────────────────────────────

const EditDomainDialog = ({
  owner,
  repo,
  row,
  open,
  onOpenChange,
  onChanged,
}: {
  owner: string;
  repo: string;
  row: DomainRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: (domains: DomainRow[]) => void;
}) => {
  const trpc = useTRPC();
  const [value, setValue] = useState(row.domain);

  const updateMutation = useMutation(
    trpc.domain.update.mutationOptions({
      onSuccess: ({ domains }) => {
        onChanged(domains);
        onOpenChange(false);
        toast.success("Domain updated.");
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const next = value.trim().toLowerCase();
  const canSave =
    next.includes(".") && next !== row.domain && !updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {row.domain}</DialogTitle>
          <DialogDescription>Change the domain name.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="domain-name">Domain</Label>
          <Input
            id="domain-name"
            value={value}
            placeholder="acme.com"
            onChange={(event) => setValue(event.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              updateMutation.mutate({
                owner,
                repo,
                domain: row.domain,
                newDomain: next,
              })
            }
            disabled={!canSave}
            isLoading={updateMutation.isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
