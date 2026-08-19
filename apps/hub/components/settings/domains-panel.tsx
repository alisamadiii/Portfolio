"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Globe,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Spinner } from "@workspace/ui/components/spinner";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { useConfig } from "@/contexts/config-context";

import { PanelError } from "@/components/settings/panel-error";

type DomainList = RouterOutputs["vercel"]["domains"]["list"];
type DomainRow = DomainList["domains"][number];

// Vercel's stable defaults, used when the synced /config response doesn't
// carry recommended values yet.
const VERCEL_A_RECORD = "76.76.21.21";
const VERCEL_CNAME = "cname.vercel-dns.com";

// ─── Panel (in-shell, rendered from Site Settings › Domain) ──────
// Self-contained: resolves the current project from config and manages the
// linked Vercel project's domains (list / add / edit / remove / refresh).

export const DomainsPanel = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { config } = useConfig();

  const owner = config?.owner;
  const repo = config?.repo;

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const listOptions = trpc.vercel.domains.list.queryOptions(
    { owner: owner ?? "", repo: repo ?? "" },
    { enabled: !!owner && !!repo }
  );
  const { data, isLoading, error, refetch, isRefetching } =
    useQuery(listOptions);

  // Every mutation returns the fresh domain list — write it straight into the
  // list cache so the UI updates without a refetch.
  const setDomains = (domains: DomainRow[]) =>
    queryClient.setQueryData(
      listOptions.queryKey,
      (old: DomainList | undefined) =>
        old?.linked ? { ...old, domains } : old
    );

  const refreshMutation = useMutation(
    trpc.vercel.domains.refresh.mutationOptions({
      onSuccess: ({ domains }) => {
        setDomains(domains);
        toast.success("Domains refreshed.");
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const toggle = (domain: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });

  if (!owner || !repo) return null;

  return (
    <div className="mx-auto w-full max-w-screen-md p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-extrabold tracking-tight">Domains</h2>
          <p className="text-muted-foreground mt-1 text-[14px]">
            The domains your website is served on.
          </p>
        </div>
        {data?.linked && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={refreshMutation.isPending}
            onClick={() => refreshMutation.mutate({ owner, repo })}
          >
            {refreshMutation.isPending ? (
              <Spinner />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Refresh
          </Button>
        )}
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
      ) : !data.linked ? (
        <div className="rounded-lg border border-dashed px-6 py-12 text-center">
          <div className="bg-accent text-accent-foreground mx-auto grid size-12 place-items-center rounded-full">
            <Globe className="size-6" />
          </div>
          <h3 className="mt-4 text-[19px] font-extrabold tracking-tight">
            No Vercel project linked
          </h3>
          <p className="text-muted-foreground mx-auto mt-2 max-w-[400px] text-[14.5px]">
            This repository isn&apos;t connected to a Vercel project yet, so
            there are no domains to manage.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <AddDomainForm
            owner={owner}
            repo={repo}
            onAdded={(domains, added) => {
              setDomains(domains);
              if (added) setExpanded((prev) => new Set(prev).add(added.domain));
            }}
          />

          <div className="bg-card divide-y rounded-lg border">
            {data.domains.length === 0 ? (
              <p className="text-muted-foreground px-5 py-8 text-center text-[14px]">
                No domains yet. Add your first domain above.
              </p>
            ) : (
              [...data.domains]
                .sort((a, b) => a.domain.localeCompare(b.domain))
                .map((row) => (
                  <DomainItem
                    key={row.domain}
                    owner={owner}
                    repo={repo}
                    row={row}
                    expanded={expanded.has(row.domain)}
                    onToggle={() => toggle(row.domain)}
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
  onAdded: (domains: DomainRow[], added: DomainRow | null) => void;
}) => {
  const trpc = useTRPC();
  const [value, setValue] = useState("");

  const addMutation = useMutation(
    trpc.vercel.domains.add.mutationOptions({
      onSuccess: ({ domains, added }) => {
        onAdded(domains, added);
        setValue("");
        toast.success(`${added?.domain ?? "Domain"} added.`);
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
  expanded,
  onToggle,
  onChanged,
}: {
  owner: string;
  repo: string;
  row: DomainRow;
  expanded: boolean;
  onToggle: () => void;
  onChanged: (domains: DomainRow[]) => void;
}) => {
  const trpc = useTRPC();
  const [editOpen, setEditOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const isVercelApp = row.domain.endsWith(".vercel.app");
  const needsSetup = !row.verified || row.misconfigured === true;

  const removeMutation = useMutation(
    trpc.vercel.domains.remove.mutationOptions({
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
            {isVercelApp && (
              <Badge variant="secondary" className="shrink-0">
                Vercel
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-muted-foreground text-[13px]">
              {row.redirect
                ? `Redirects to ${row.redirect}`
                : row.gitBranch
                  ? `Branch: ${row.gitBranch}`
                  : "Production"}
            </span>
          </div>
        </div>

        <StatusBadge row={row} />

        {needsSetup && (
          <Button variant="ghost" size="sm" onClick={onToggle}>
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              Edit
            </DropdownMenuItem>
            {!isVercelApp && (
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setRemoveOpen(true)}
              >
                Remove
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {needsSetup && expanded && <DnsInstructions row={row} />}

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
              Your website will no longer be reachable on this domain. DNS
              records at your registrar are not deleted.
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

const StatusBadge = ({ row }: { row: DomainRow }) => {
  if (!row.verified) {
    return (
      <Badge variant="outline" className="text-status-warning shrink-0 gap-1">
        <AlertTriangle className="size-3" />
        Pending Verification
      </Badge>
    );
  }
  if (row.misconfigured) {
    return (
      <Badge variant="outline" className="text-destructive shrink-0 gap-1">
        <AlertTriangle className="size-3" />
        Invalid Configuration
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-status-success shrink-0 gap-1">
      <Check className="size-3" />
      Valid Configuration
    </Badge>
  );
};

// ─── DNS instructions (unverified / misconfigured domains) ───────
// TXT rows come from Vercel's `verification` challenges; the A/CNAME row from
// the synced /config response, falling back to Vercel's stable defaults.

const DnsInstructions = ({ row }: { row: DomainRow }) => {
  const isApex = row.domain === row.apexName;
  const dnsConfig = (row.dnsConfig ?? {}) as Record<string, unknown>;

  const records: { type: string; name: string; value: string }[] = [];

  if (isApex) {
    records.push({
      type: "A",
      name: "@",
      value: firstString(dnsConfig.recommendedIPv4) ?? VERCEL_A_RECORD,
    });
  } else {
    records.push({
      type: "CNAME",
      name: row.domain.slice(0, -(row.apexName.length + 1)),
      value: firstString(dnsConfig.recommendedCNAME) ?? VERCEL_CNAME,
    });
  }

  for (const challenge of row.verification ?? []) {
    records.push({
      type: challenge.type,
      // "_vercel.acme.com" → "_vercel"
      name: challenge.domain.replace(`.${row.apexName}`, ""),
      value: challenge.value,
    });
  }

  return (
    <div className="bg-muted/40 border-t px-5 py-4">
      <p className="text-muted-foreground mb-3 text-[13px]">
        Add the following records to your DNS provider, then hit Refresh.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="text-muted-foreground text-xs font-semibold uppercase">
              <th className="pb-2 pr-4">Type</th>
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2">Value</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={`${record.type}-${record.name}-${record.value}`}>
                <td className="py-1.5 pr-4 font-mono font-semibold">
                  {record.type}
                </td>
                <td className="py-1.5 pr-4 font-mono">{record.name}</td>
                <td className="py-1.5">
                  <CopyValue value={record.value} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Dig a first string out of Vercel's recommended* shapes, which vary between
// plain strings, string arrays and [{ rank, value }] entries.
const firstString = (input: unknown): string | null => {
  if (typeof input === "string") return input;
  if (Array.isArray(input)) {
    for (const entry of input) {
      const found = firstString(
        entry && typeof entry === "object" && "value" in entry
          ? (entry as { value: unknown }).value
          : entry
      );
      if (found) return found;
    }
  }
  return null;
};

const CopyValue = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="hover:text-foreground group flex max-w-full items-center gap-1.5 font-mono"
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      <span className="truncate">{value}</span>
      {copied ? (
        <Check className="text-status-success size-3.5 shrink-0" />
      ) : (
        <Copy className="text-muted-foreground group-hover:text-foreground size-3.5 shrink-0" />
      )}
    </button>
  );
};

// ─── Edit dialog (redirect / branch, like the Vercel dashboard) ──

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
  const [redirect, setRedirect] = useState(row.redirect ?? "");
  const [statusCode, setStatusCode] = useState(
    String(row.redirectStatusCode ?? 307)
  );
  const [gitBranch, setGitBranch] = useState(row.gitBranch ?? "");

  const updateMutation = useMutation(
    trpc.vercel.domains.update.mutationOptions({
      onSuccess: ({ domains }) => {
        onChanged(domains);
        onOpenChange(false);
        toast.success(`${row.domain} updated.`);
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const save = () => {
    const nextRedirect = redirect.trim() || null;
    updateMutation.mutate({
      owner,
      repo,
      domain: row.domain,
      redirect: nextRedirect,
      redirectStatusCode: nextRedirect
        ? (Number(statusCode) as 301 | 302 | 307 | 308)
        : null,
      gitBranch: gitBranch.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {row.domain}</DialogTitle>
          <DialogDescription>
            Redirect this domain to another one, or serve a specific git
            branch on it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="domain-redirect">Redirect to</Label>
            <Input
              id="domain-redirect"
              value={redirect}
              placeholder="acme.com (empty for no redirect)"
              onChange={(event) => setRedirect(event.target.value)}
            />
          </div>

          {redirect.trim() && (
            <div className="space-y-2">
              <Label>Status code</Label>
              <Select
                value={statusCode}
                onValueChange={(value) => value && setStatusCode(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="307">307 Temporary Redirect</SelectItem>
                  <SelectItem value="301">301 Permanent Redirect</SelectItem>
                  <SelectItem value="302">302 Found</SelectItem>
                  <SelectItem value="308">308 Permanent Redirect</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="domain-branch">Git branch</Label>
            <Input
              id="domain-branch"
              value={gitBranch}
              placeholder="main (empty for production)"
              onChange={(event) => setGitBranch(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={updateMutation.isPending}
            isLoading={updateMutation.isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
