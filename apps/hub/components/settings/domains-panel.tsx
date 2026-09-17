"use client";

import { useState } from "react";
import { useConfig } from "@/contexts/config-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@workspace/ui/components/combobox";
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
import { Switch } from "@workspace/ui/components/switch";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import {
  ExternalLink,
  Globe,
  MoreHorizontal,
  Plus,
  Trash2,
} from "@/components/icon";
import { PanelError } from "@/components/settings/panel-error";

type DomainList = RouterOutputs["domain"]["list"];
type DomainRow = DomainList["domains"][number];
type DnsRecord = RouterOutputs["domain"]["dnsRecords"]["records"][number];

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

          <DnsRecordsSection owner={owner} repo={repo} domains={data.domains} />
        </div>
      )}
    </div>
  );
};

// ─── DNS records section (one panel per bound Cloudflare zone) ────
// DNS is zone-level: the apex and its www share one zone and the same records,
// so records live here once per zone rather than duplicated on each domain row.

const DnsRecordsSection = ({
  owner,
  repo,
  domains,
}: {
  owner: string;
  repo: string;
  domains: DomainRow[];
}) => {
  // Group bound domains by zone; label each with its apex (shortest host).
  const zones = new Map<string, string>();
  for (const d of domains) {
    if (!d.cfZoneId) continue;
    const current = zones.get(d.cfZoneId);
    if (!current || d.domain.length < current.length) {
      zones.set(d.cfZoneId, d.domain);
    }
  }
  if (zones.size === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-[17px] font-extrabold tracking-tight">
          DNS records
        </h3>
        <p className="text-muted-foreground mt-0.5 text-[13.5px]">
          Records for your Cloudflare {zones.size > 1 ? "zones" : "zone"}.
        </p>
      </div>
      {[...zones.entries()].map(([zoneId, apex]) => (
        <div key={zoneId} className="bg-card overflow-hidden rounded-lg border">
          <div className="flex items-center gap-2 px-5 py-3">
            <span className="text-[14.5px] font-bold">{apex}</span>
            <Badge variant="outline" className="gap-1">
              <span className="size-1.5 rounded-full bg-[#F38020]" />
              Cloudflare
            </Badge>
          </div>
          <DnsSection owner={owner} repo={repo} domain={apex} />
        </div>
      ))}
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

  // Cloudflare zones the project can pick from — suggestions in the combobox;
  // free text still works (custom domain, no DNS ability).
  const { data: cf } = useQuery(
    trpc.domain.cfZones.queryOptions({ owner, repo }, { retry: false })
  );

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

  const zoneNames = cf?.connected ? cf.zones.map((z) => z.name) : [];
  const domain = value.trim().toLowerCase();
  // Typed/picked value matching a zone → bind it; otherwise plain free text.
  const zone = cf?.connected
    ? cf.zones.find((z) => z.name === domain)
    : undefined;
  const canAdd = addMutation.isPending
    ? false
    : zone
      ? true
      : domain.includes(".");

  const submit = () => {
    if (!canAdd) return;
    if (zone) {
      addMutation.mutate({ owner, repo, domain: zone.name, zoneId: zone.id });
    } else {
      addMutation.mutate({ owner, repo, domain });
    }
  };

  return (
    <div className="space-y-2">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Combobox
          items={zoneNames}
          inputValue={value}
          onInputValueChange={(next) => setValue(next ?? "")}
          value={zoneNames.includes(value) ? value : null}
          onValueChange={(next) => {
            if (typeof next === "string") setValue(next);
          }}
        >
          <ComboboxInput
            placeholder={
              cf?.connected
                ? "Pick a Cloudflare domain or type one…"
                : "acme.com"
            }
            className="h-9 flex-1"
          />
          <ComboboxContent>
            <ComboboxEmpty>No matches — free text works too</ComboboxEmpty>
            <ComboboxList>
              {(item: string) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <Button
          type="submit"
          className="rounded-full px-5"
          disabled={!canAdd}
          isLoading={addMutation.isPending}
        >
          Add
        </Button>
      </form>
      {!cf?.connected && (
        <p className="text-muted-foreground text-[13px]">
          <a href="/integrations" className="font-medium underline">
            Connect Cloudflare
          </a>{" "}
          to pick a domain and manage its DNS here.
        </p>
      )}
    </div>
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
            {row.cfZoneId && (
              <Badge variant="outline" className="shrink-0 gap-1">
                <span className="size-1.5 rounded-full bg-[#F38020]" />
                Cloudflare
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
              It will be removed from this project. DNS records at your
              registrar are not touched.
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

// ─── DNS records (Cloudflare-bound domains) ──────────────────────

const RECORD_TYPES = ["A", "AAAA", "CNAME", "TXT", "MX"] as const;
// Only these get the orange-cloud proxy toggle; others are DNS-only.
const PROXYABLE = new Set(["A", "AAAA", "CNAME"]);

const DnsSection = ({
  owner,
  repo,
  domain,
}: {
  owner: string;
  repo: string;
  domain: string;
}) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const recordsOptions = trpc.domain.dnsRecords.queryOptions(
    { owner, repo, domain },
    { retry: false }
  );
  const { data, isLoading, error, refetch, isRefetching } =
    useQuery(recordsOptions);

  const setRecords = (records: DnsRecord[]) =>
    queryClient.setQueryData(recordsOptions.queryKey, { records });

  const addMutation = useMutation(
    trpc.domain.addDnsRecord.mutationOptions({
      onSuccess: ({ records }) => {
        setRecords(records);
        toast.success("DNS record added.");
      },
      onError: (err) => toast.error(err.message),
    })
  );
  const deleteMutation = useMutation(
    trpc.domain.deleteDnsRecord.mutationOptions({
      onSuccess: ({ records }) => {
        setRecords(records);
        toast.success("DNS record removed.");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  return (
    <div className="bg-muted/30 border-t px-5 py-4">
      {error ? (
        <PanelError
          title="Failed to load DNS records"
          message={error.message}
          onRetry={() => void refetch()}
          retrying={isRefetching}
        />
      ) : isLoading || !data ? (
        <div className="flex justify-center py-6">
          <Spinner className="text-muted-foreground size-5" />
        </div>
      ) : (
        <div className="space-y-3">
          {data.records.length === 0 ? (
            <p className="text-muted-foreground text-[13px]">
              No DNS records yet.
            </p>
          ) : (
            <div className="divide-y overflow-hidden rounded-md border">
              {data.records.map((record) => (
                <div
                  key={record.id}
                  className="bg-card flex items-center gap-3 px-3 py-2 text-[13px]"
                >
                  <span className="w-14 shrink-0 font-mono font-semibold">
                    {record.type}
                  </span>
                  <span className="w-40 shrink-0 truncate font-medium">
                    {record.name}
                  </span>
                  <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono">
                    {record.content}
                  </span>
                  {record.proxied && (
                    <span className="shrink-0 text-[#F38020]">Proxied</span>
                  )}
                  <span className="text-muted-foreground shrink-0">
                    {record.ttl === 1 ? "Auto" : record.ttl}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    disabled={deleteMutation.isPending}
                    onClick={() =>
                      deleteMutation.mutate({
                        owner,
                        repo,
                        domain,
                        recordId: record.id,
                      })
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <AddDnsRecordForm
            pending={addMutation.isPending}
            onAdd={(record) =>
              addMutation.mutate({ owner, repo, domain, record })
            }
          />
        </div>
      )}
    </div>
  );
};

const AddDnsRecordForm = ({
  pending,
  onAdd,
}: {
  pending: boolean;
  onAdd: (record: {
    type: (typeof RECORD_TYPES)[number];
    name: string;
    content: string;
    proxied?: boolean;
    ttl?: number;
  }) => void;
}) => {
  const [type, setType] = useState<(typeof RECORD_TYPES)[number]>("A");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [proxied, setProxied] = useState(false);

  const canAdd = !pending && name.trim() && content.trim();

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canAdd) return;
        onAdd({
          type,
          name: name.trim(),
          content: content.trim(),
          proxied: PROXYABLE.has(type) ? proxied : undefined,
        });
        setName("");
        setContent("");
        setProxied(false);
      }}
    >
      <Select
        value={type}
        onValueChange={(v) =>
          setType((v as (typeof RECORD_TYPES)[number]) ?? "A")
        }
      >
        <SelectTrigger className="h-8 w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RECORD_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={name}
        placeholder="Name (@ for root)"
        className="w-40"
        onChange={(event) => setName(event.target.value)}
        disabled={pending}
      />
      <Input
        value={content}
        placeholder="Content"
        className="min-w-40 flex-1"
        onChange={(event) => setContent(event.target.value)}
        disabled={pending}
      />
      {PROXYABLE.has(type) && (
        <label className="text-muted-foreground flex items-center gap-1.5 text-[13px]">
          <Switch checked={proxied} onCheckedChange={setProxied} />
          Proxy
        </label>
      )}
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={!canAdd}
        isLoading={pending}
      >
        <Plus className="size-3.5" />
        Add
      </Button>
    </form>
  );
};
