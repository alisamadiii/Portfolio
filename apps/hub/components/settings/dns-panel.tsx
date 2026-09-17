"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
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

import { ChevronDown, ChevronRight, Globe, Plus, Trash2 } from "@/components/icon";
import { useConfig } from "@/contexts/config-context";
import { PanelError } from "@/components/settings/panel-error";

type DomainRow = RouterOutputs["domain"]["list"]["domains"][number];
type DnsRecord = RouterOutputs["domain"]["dnsRecords"]["records"][number];

// ─── Panel (Site Settings › DNS) ─────────────────────────────────
// DNS is zone-level: a project's Cloudflare-bound domains group by zone (apex
// and its www share one zone), and each zone gets one records panel. Domains
// are added/managed in the Domain tab; this tab manages their DNS.

export const DnsPanel = () => {
  const trpc = useTRPC();
  const { config } = useConfig();

  const owner = config?.owner;
  const repo = config?.repo;

  const { data, isLoading, error, refetch, isRefetching } = useQuery(
    trpc.domain.list.queryOptions(
      { owner: owner ?? "", repo: repo ?? "" },
      { enabled: !!owner && !!repo }
    )
  );
  // Only used to tailor the empty state's call to action.
  const { data: cf } = useQuery(
    trpc.domain.cfZones.queryOptions(
      { owner: owner ?? "", repo: repo ?? "" },
      { enabled: !!owner && !!repo, retry: false }
    )
  );

  if (!owner || !repo) return null;

  const bound = data?.domains.some((d) => d.cfZoneId) ?? false;

  return (
    <div className="mx-auto w-full max-w-screen-md p-6">
      <div className="mb-6">
        <h2 className="text-[22px] font-extrabold tracking-tight">DNS</h2>
        <p className="text-muted-foreground mt-1 text-[14px]">
          Manage DNS records for your Cloudflare domains.
        </p>
      </div>

      {error ? (
        <PanelError
          title="Failed to load DNS"
          message={error.message}
          onRetry={() => void refetch()}
          retrying={isRefetching}
        />
      ) : isLoading || !data ? (
        <div className="flex justify-center py-24">
          <Spinner className="text-muted-foreground size-6" />
        </div>
      ) : !bound ? (
        <div className="bg-card rounded-lg border px-6 py-12 text-center">
          <div className="bg-accent text-accent-foreground mx-auto grid size-12 place-items-center rounded-full">
            <Globe className="size-6" />
          </div>
          <p className="text-muted-foreground mx-auto mt-4 max-w-[400px] text-[14.5px]">
            {cf?.connected ? (
              <>
                No Cloudflare domains yet. Add one from the{" "}
                <span className="font-medium">Domain</span> tab to manage its DNS
                here.
              </>
            ) : (
              <>
                <a href="/integrations" className="font-medium underline">
                  Connect Cloudflare
                </a>{" "}
                and add a domain to manage its DNS here.
              </>
            )}
          </p>
        </div>
      ) : (
        <DnsRecordsSection owner={owner} repo={repo} domains={data.domains} />
      )}
    </div>
  );
};

// ─── Records grouped by zone ─────────────────────────────────────

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

  return (
    <div className="space-y-3">
      {[...zones.entries()].map(([zoneId, apex]) => (
        <ZoneCard key={zoneId} owner={owner} repo={repo} apex={apex} />
      ))}
    </div>
  );
};

const ZoneCard = ({
  owner,
  repo,
  apex,
}: {
  owner: string;
  repo: string;
  apex: string;
}) => {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-card overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 px-5 py-3 text-left"
      >
        {open ? (
          <ChevronDown className="text-muted-foreground size-4 shrink-0" />
        ) : (
          <ChevronRight className="text-muted-foreground size-4 shrink-0" />
        )}
        <span className="text-[14.5px] font-bold">{apex}</span>
        <Badge variant="outline" className="gap-1">
          <span className="size-1.5 rounded-full bg-[#F38020]" />
          Cloudflare
        </Badge>
      </button>
      {open && <DnsSection owner={owner} repo={repo} domain={apex} />}
    </div>
  );
};

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
