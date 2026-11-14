"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Check, Copy, ExternalLink, KeyRound, Send, Trash2 } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";

import { authClient } from "@workspace/auth/auth-client";
import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { PageHeader } from "@/components/ds/layout/page-header";
import { Badge, type BadgeTone } from "@/components/ds/ui/badge";
import { Button, ButtonAnchor } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { Field, Input, Select } from "@/components/ds/ui/field";
import { EmptyState } from "@/components/ds/ui/misc";
import { useProject } from "@/hooks/use-project";
import { useRouteProjectId } from "@/hooks/use-repo";
import { connectErrorURL } from "@/lib/connect-errors";
import { repoPath } from "@/lib/paths";
import { handleCmsError } from "@/lib/trpc-errors";

type Overview = RouterOutputs["resend"]["overview"];
type Domain = Overview["domains"][number];
type Email = Overview["emails"][number];
type ApiKey = RouterOutputs["resend"]["apiKeys"][number];

const ago = (iso: string | null) =>
  iso ? formatDistanceToNow(parseISO(iso), { addSuffix: true }) : "—";

const domainBadge = (status: string): { tone: BadgeTone; label: string } => {
  if (status === "verified") return { tone: "success", label: "Verified" };
  if (status === "failed" || status === "temporary_failure")
    return { tone: "coral", label: "Failed" };
  if (status === "not_started") return { tone: "neutral", label: "Not started" };
  return { tone: "info", label: "Pending" };
};

export const emailBadge = (status: string | null): { tone: BadgeTone; label: string } => {
  if (!status) return { tone: "neutral", label: "—" };
  if (status === "delivered" || status === "opened" || status === "clicked")
    return { tone: "success", label: status[0].toUpperCase() + status.slice(1) };
  if (status === "bounced" || status === "complained" || status === "failed")
    return { tone: "coral", label: status[0].toUpperCase() + status.slice(1) };
  return { tone: "neutral", label: status[0].toUpperCase() + status.slice(1) };
};

const emailColumns: Column<Email>[] = [
  {
    key: "to",
    header: "To",
    width: "minmax(180px, 2fr)",
    cell: (e) => <span className="truncate text-ink">{e.to || "—"}</span>,
  },
  {
    key: "subject",
    header: "Subject",
    width: "minmax(200px, 3fr)",
    cell: (e) => <span className="truncate">{e.subject || "—"}</span>,
  },
  {
    key: "status",
    header: "Status",
    width: "120px",
    cell: (e) => {
      const b = emailBadge(e.status);
      return <Badge tone={b.tone}>{b.label}</Badge>;
    },
  },
  {
    key: "when",
    header: "Sent",
    width: "140px",
    align: "end",
    cell: (e) => ago(e.createdAt),
  },
];

/** Project Resend app: connect the client's Resend, see domains + emails, mint API keys. */
export function ResendPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const project = useProject();
  const fullAccess = project?.role === "full-access";
  const [returned, setReturned] = useQueryState("resend", parseAsString);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const router = useRouter();

  const statusKey = trpc.resend.status.queryKey({ projectId });
  const status = useQuery(trpc.resend.status.queryOptions({ projectId }));
  const connected = !!status.data?.connected;
  const overview = useQuery(
    trpc.resend.overview.queryOptions({ projectId }, { enabled: connected, retry: false })
  );

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: statusKey });
    void queryClient.invalidateQueries({
      queryKey: trpc.resend.overview.queryKey({ projectId }),
    });
  };

  const connect = useMutation(
    trpc.resend.connect.mutationOptions({
      onSuccess: () => {
        toast.success("Resend connected.");
        refresh();
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't connect Resend.")),
    })
  );
  const disconnect = useMutation(
    trpc.resend.disconnect.mutationOptions({
      onSuccess: refresh,
      onError: (error) => toast.error(handleCmsError(error, "Couldn't disconnect Resend.")),
    })
  );

  // Back from Resend's consent screen: bind the freshly linked account.
  useEffect(() => {
    if (returned !== "connected" || !status.data) return;
    void setReturned(null);
    if (!status.data.connected && fullAccess) connect.mutate({ projectId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returned, status.data, fullAccess]);

  // Always through Resend's consent screen: each project gets its own team.
  const startConnect = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("resend", "connected");
    const { error } = await authClient.oauth2.link({
      providerId: "resend",
      callbackURL: url.toString(),
      errorCallbackURL: connectErrorURL("Resend"),
    });
    if (error) toast.error(error.message ?? "Couldn't start Resend sign-in.");
  };

  const header = (
    <PageHeader
      title="Resend"
      description="The email account your website sends from: domains, recent emails and API keys."
      actions={
        connected ? (
          <div className="flex gap-2">
            <ButtonAnchor
              href="https://resend.com/emails"
              target="_blank"
              rel="noreferrer"
              icon={<ExternalLink className="size-4" />}
            >
              Open Resend
            </ButtonAnchor>
            {fullAccess && (
              <Button
                variant="ghost"
                onClick={() => setConfirmDisconnect(true)}
                disabled={disconnect.isPending}
              >
                {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
              </Button>
            )}
          </div>
        ) : undefined
      }
    />
  );
  const disconnectDialog = (
    <ConfirmDialog
      open={confirmDisconnect}
      onOpenChange={setConfirmDisconnect}
      title="Disconnect Resend?"
      description="The hub loses access to this Resend account and the grant is revoked at Resend. API keys you already created keep working. Connecting again needs the account owner's consent."
      confirmLabel="Disconnect"
      danger
      onConfirm={() => disconnect.mutate({ projectId })}
    />
  );

  if (status.isPending) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Skeleton className="h-[280px] rounded-card" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Card>
          <EmptyState
            icon={<Send className="size-5" />}
            title="Connect your Resend account"
            text={
              fullAccess
                ? "Connect Resend so we can set up email for your website. You won't need to share your password."
                : "The site owner hasn't connected Resend yet."
            }
            action={
              fullAccess && (
                <Button
                  variant="primary"
                  onClick={() => void startConnect()}
                  disabled={connect.isPending}
                >
                  Connect Resend
                </Button>
              )
            }
          />
        </Card>
      </div>
    );
  }

  if (overview.isError) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        {disconnectDialog}
        <Card>
          <EmptyState
            icon={<Send className="size-5" />}
            title="Couldn't load Resend"
            text={handleCmsError(overview.error, "Resend didn't answer. Try again in a moment.")}
            action={
              fullAccess && (
                <Button variant="primary" onClick={() => void startConnect()}>
                  Reconnect Resend
                </Button>
              )
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}
      {disconnectDialog}
      {overview.isPending ? (
        <Skeleton className="h-[200px] rounded-card" />
      ) : (
        <DomainsCard domains={overview.data.domains} />
      )}
      {fullAccess && (
        <ApiKeyCard
          domains={overview.data?.domains ?? []}
          onNetlify={!!status.data?.onNetlify}
        />
      )}
      <Card>
        <CardHeader title="Recent emails" divided />
        {overview.isPending ? (
          <Skeleton className="m-6 h-[160px]" />
        ) : (
          <DataTable
            columns={emailColumns}
            rows={overview.data.emails}
            rowKey={(e) => e.id}
            onRowClick={(e) => router.push(repoPath(projectId, "resend", e.id))}
            empty={<p className="px-6 py-8 text-center text-[13px] text-dim">No emails sent yet.</p>}
          />
        )}
      </Card>
    </div>
  );
}

function DomainsCard({ domains }: { domains: Domain[] }) {
  const trpc = useTRPC();
  const projectId = useRouteProjectId();
  const [openId, setOpenId] = useState<string | null>(null);
  const records = useQuery(
    trpc.resend.domain.queryOptions(
      { projectId, domainId: openId ?? "" },
      { enabled: !!openId }
    )
  );

  const columns: Column<Domain>[] = [
    {
      key: "name",
      header: "Domain",
      width: "minmax(200px, 2fr)",
      cell: (d) => <span className="font-medium text-ink">{d.name}</span>,
    },
    {
      key: "status",
      header: "Status",
      width: "140px",
      cell: (d) => {
        const b = domainBadge(d.status);
        return (
          <Badge tone={b.tone} dot>
            {b.label}
          </Badge>
        );
      },
    },
    { key: "region", header: "Region", width: "140px", cell: (d) => d.region ?? "—" },
    { key: "created", header: "Added", width: "140px", align: "end", cell: (d) => ago(d.createdAt) },
  ];

  return (
    <Card>
      <CardHeader title="Domains" divided />
      <DataTable
        columns={columns}
        rows={domains}
        rowKey={(d) => d.id}
        onRowClick={(d) => setOpenId(openId === d.id ? null : d.id)}
        empty={
          <p className="px-6 py-8 text-center text-[13px] text-dim">
            No domains in this Resend account yet.
          </p>
        }
      />
      {openId && (
        <div className="flex flex-col gap-3 border-t border-divider px-6 py-4">
          <span className="text-[13px] font-semibold text-ink">
            DNS records for {records.data?.name ?? "…"}
          </span>
          {records.isPending ? (
            <Skeleton className="h-[80px]" />
          ) : (
            <div className="overflow-x-auto">
              <div className="flex min-w-[560px] flex-col gap-2 text-[13px]">
                {(records.data?.records ?? []).map((r, i) => (
                  <div key={i} className="grid grid-cols-[60px_minmax(140px,1fr)_minmax(200px,2fr)_90px] items-center gap-3">
                    <span className="font-medium text-ink">{r.type}</span>
                    <span className="truncate text-ink-3">{r.name}</span>
                    <span className="truncate text-ink-3" title={r.value}>{r.value}</span>
                    <Badge tone={r.status === "verified" ? "success" : "neutral"}>
                      {r.status === "verified" ? "Verified" : "Not yet"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function ApiKeyCard({ domains, onNetlify }: { domains: Domain[]; onNetlify: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const keysKey = trpc.resend.apiKeys.queryKey({ projectId });
  const keys = useQuery(trpc.resend.apiKeys.queryOptions({ projectId }, { retry: false }));
  const [deleting, setDeleting] = useState<ApiKey | null>(null);
  const remove = useMutation(
    trpc.resend.deleteApiKey.mutationOptions({
      onSuccess: () => {
        toast.success("Key deleted. Anything using it can no longer send.");
        void queryClient.invalidateQueries({ queryKey: keysKey });
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't delete the key.")),
    })
  );
  const [name, setName] = useState("Website");
  const [domainId, setDomainId] = useState("");
  const [key, setKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedToNetlify, setSavedToNetlify] = useState(false);
  const [confirming, setConfirming] = useState<"create" | "netlify" | null>(null);

  const create = useMutation(
    trpc.resend.createApiKey.mutationOptions({
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: keysKey });
        setKey(result.token);
        setCopied(false);
        setSavedToNetlify(false);
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't create the key.")),
    })
  );
  const push = useMutation(
    trpc.resend.pushToNetlify.mutationOptions({
      onSuccess: () => {
        setSavedToNetlify(true);
        toast.success("Saved as RESEND_API_KEY on Netlify. It applies on the next publish.");
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't save it on Netlify.")),
    })
  );

  const copy = async () => {
    if (!key) return;
    await navigator.clipboard.writeText(key);
    setCopied(true);
  };

  return (
    <Card>
      <CardHeader title="API keys" divided />
      <div className="flex flex-col gap-4 px-6 py-5">
        <p className="text-[13px] leading-normal text-dim">
          Create a sending-only key in this Resend account for the website. It&apos;s shown once,
          so copy it now.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Name" className="min-w-[200px] flex-1">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
          </Field>
          <Field label="Domain" optional className="min-w-[200px] flex-1">
            <Select value={domainId} onChange={(e) => setDomainId(e.target.value)}>
              <option value="">All domains</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            variant="primary"
            icon={<KeyRound className="size-4" />}
            disabled={!name.trim() || create.isPending}
            onClick={() => setConfirming("create")}
          >
            Create key
          </Button>
        </div>
        {key && (
          <div className="flex flex-wrap items-center gap-3 rounded-control border border-line bg-sidebar px-3 py-2">
            <code className="min-w-0 flex-1 truncate text-[13px] text-ink">{key}</code>
            <Button
              size="sm"
              onClick={() => void copy()}
              icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
            {onNetlify && (
              <Button
                size="sm"
                variant="dark"
                disabled={push.isPending || savedToNetlify}
                onClick={() => setConfirming("netlify")}
              >
                {savedToNetlify ? "Saved on Netlify" : "Add to Netlify"}
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="border-t border-divider">
        <div className="px-6 pt-4 pb-1 text-[13px] font-semibold text-ink">Existing keys</div>
        {keys.isPending ? (
          <Skeleton className="mx-6 my-4 h-[80px]" />
        ) : keys.isError ? (
          <p className="px-6 py-4 text-[13px] text-dim">
            {handleCmsError(keys.error, "Couldn't load the keys.")}
          </p>
        ) : (
          <DataTable
            columns={[
              {
                key: "name",
                header: "Name",
                width: "minmax(180px, 2fr)",
                cell: (k: ApiKey) => <span className="truncate font-medium text-ink">{k.name}</span>,
              },
              { key: "created", header: "Created", width: "150px", cell: (k: ApiKey) => ago(k.createdAt) },
              { key: "used", header: "Last used", width: "150px", cell: (k: ApiKey) => ago(k.lastUsedAt) },
              {
                key: "delete",
                header: "",
                width: "90px",
                align: "end",
                cell: (k: ApiKey) => (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Trash2 className="size-3.5" />}
                    onClick={() => setDeleting(k)}
                    disabled={remove.isPending}
                  >
                    Delete
                  </Button>
                ),
              },
            ]}
            rows={keys.data}
            rowKey={(k) => k.id}
            minWidth={560}
            empty={<p className="px-6 py-6 text-center text-[13px] text-dim">No API keys yet.</p>}
          />
        )}
      </div>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={<>Delete &ldquo;{deleting?.name}&rdquo;?</>}
        description="Anything using this key, like a website contact form, stops sending email right away. This can't be undone."
        confirmLabel="Delete key"
        cancelLabel="Keep key"
        danger
        onConfirm={() => {
          if (deleting) remove.mutate({ projectId, keyId: deleting.id });
        }}
      />
      <ConfirmDialog
        open={confirming === "create"}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={<>Create &ldquo;{name.trim()}&rdquo;?</>}
        description={`A new sending-only key is created in this Resend account${
          domainId ? ` for ${domains.find((d) => d.id === domainId)?.name ?? "the chosen domain"}` : " for all domains"
        }. It's shown once, so copy it right after.`}
        confirmLabel="Create key"
        onConfirm={() =>
          create.mutate({ projectId, name: name.trim(), domainId: domainId || undefined })
        }
      />
      <ConfirmDialog
        open={confirming === "netlify"}
        onOpenChange={(open) => !open && setConfirming(null)}
        title="Save this key on Netlify?"
        description="It's saved as RESEND_API_KEY on the website's Netlify site, replacing any existing value. It applies on the next publish."
        confirmLabel="Save on Netlify"
        onConfirm={() => key && push.mutate({ projectId, apiKey: key })}
      />
    </Card>
  );
}
