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

import { Globe, Plus, Trash2 } from "@/components/icon";
import { useConfig } from "@/contexts/config-context";
import { PanelError } from "@/components/settings/panel-error";

type DnsRecord = RouterOutputs["domain"]["dnsRecords"]["records"][number];

// ─── Panel (Site Settings › DNS) ─────────────────────────────────
// Each project picks a Cloudflare zone; we read/show its DNS records here so the
// user can view, add and remove them. We never change their Cloudflare setup
// beyond the records they edit here.

export const DnsPanel = () => {
  const trpc = useTRPC();
  const { config } = useConfig();
  const owner = config?.owner;
  const repo = config?.repo;
  const scope = { owner: owner ?? "", repo: repo ?? "" };
  const [changing, setChanging] = useState(false);

  const { data: zone, isLoading, error, refetch, isRefetching } = useQuery(
    trpc.domain.dnsZone.queryOptions(scope, { enabled: !!owner && !!repo })
  );

  if (!owner || !repo) return null;

  return (
    <div className="mx-auto w-full max-w-screen-md p-6">
      <div className="mb-6">
        <h2 className="text-[22px] font-extrabold tracking-tight">DNS</h2>
        <p className="text-muted-foreground mt-1 text-[14px]">
          View and manage DNS records for your Cloudflare zone.
        </p>
      </div>

      {error ? (
        <PanelError
          title="Failed to load DNS"
          message={error.message}
          onRetry={() => void refetch()}
          retrying={isRefetching}
        />
      ) : isLoading || !zone ? (
        <div className="flex justify-center py-24">
          <Spinner className="text-muted-foreground size-6" />
        </div>
      ) : !zone.connected ? (
        <EmptyCard>
          <a href="/integrations" className="font-medium underline">
            Connect Cloudflare
          </a>{" "}
          to manage this project&apos;s DNS.
        </EmptyCard>
      ) : !zone.zone || changing ? (
        <ZonePicker
          owner={owner}
          repo={repo}
          current={zone.zone?.id}
          onSaved={() => setChanging(false)}
          onCancel={zone.zone ? () => setChanging(false) : undefined}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[14.5px] font-bold">{zone.zone.name}</span>
              <Badge variant="outline" className="gap-1">
                <span className="size-1.5 rounded-full bg-[#F38020]" />
                Cloudflare
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setChanging(true)}>
              Change zone
            </Button>
          </div>
          <div className="bg-card overflow-hidden rounded-lg border">
            <DnsSection owner={owner} repo={repo} />
          </div>
        </div>
      )}
    </div>
  );
};

const EmptyCard = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-card rounded-lg border px-6 py-12 text-center">
    <div className="bg-accent text-accent-foreground mx-auto grid size-12 place-items-center rounded-full">
      <Globe className="size-6" />
    </div>
    <p className="text-muted-foreground mx-auto mt-4 max-w-[400px] text-[14.5px]">
      {children}
    </p>
  </div>
);

const ZonePicker = ({
  owner,
  repo,
  current,
  onSaved,
  onCancel,
}: {
  owner: string;
  repo: string;
  current?: string;
  onSaved: () => void;
  onCancel?: () => void;
}) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [zoneId, setZoneId] = useState(current ?? "");

  const { data, isLoading } = useQuery(
    trpc.domain.dnsZones.queryOptions({ owner, repo }, { retry: false })
  );

  const save = useMutation(
    trpc.domain.setDnsZone.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.domain.dnsZone.queryOptions({ owner, repo }).queryKey,
        });
        await queryClient.invalidateQueries({
          queryKey: trpc.domain.dnsRecords.queryOptions({ owner, repo }).queryKey,
        });
        toast.success("DNS zone set.");
        onSaved();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  return (
    <div className="bg-card space-y-4 rounded-lg border p-6">
      <p className="text-muted-foreground text-[13.5px]">
        Pick the Cloudflare zone whose DNS you want to manage. We only read and
        show your DNS — we don&apos;t change your Cloudflare setup.
      </p>
      {isLoading ? (
        <Spinner className="text-muted-foreground size-5" />
      ) : (
        <div className="flex gap-2">
          <Select value={zoneId} onValueChange={(v) => setZoneId(v ?? "")}>
            <SelectTrigger className="h-8 flex-1">
              <SelectValue placeholder="Choose a domain…" />
            </SelectTrigger>
            <SelectContent>
              {(data?.zones ?? []).map((z) => (
                <SelectItem key={z.id} value={z.id}>
                  {z.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={!zoneId || save.isPending}
            isLoading={save.isPending}
            onClick={() => save.mutate({ owner, repo, zoneId })}
          >
            Save
          </Button>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

const RECORD_TYPES = ["A", "AAAA", "CNAME", "TXT", "MX"] as const;
const PROXYABLE = new Set(["A", "AAAA", "CNAME"]);

const DnsSection = ({ owner, repo }: { owner: string; repo: string }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const recordsOptions = trpc.domain.dnsRecords.queryOptions(
    { owner, repo },
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
    <div className="bg-muted/30 px-5 py-4">
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
            <p className="text-muted-foreground text-[13px]">No DNS records yet.</p>
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
                      deleteMutation.mutate({ owner, repo, recordId: record.id })
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
            onAdd={(record) => addMutation.mutate({ owner, repo, record })}
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
      <Button type="submit" size="sm" variant="outline" disabled={!canAdd} isLoading={pending}>
        <Plus className="size-3.5" />
        Add
      </Button>
    </form>
  );
};
