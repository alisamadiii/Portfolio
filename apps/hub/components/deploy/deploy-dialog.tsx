"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
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
import { Github } from "@workspace/ui/icons/social";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { Blocks, Check, LockKeyhole, Plus, X } from "@/components/icon";
import { repoPath } from "@/lib/paths";

type Repo = RouterOutputs["deploy"]["githubRepos"][number];
type CfProject = RouterOutputs["deploy"]["cloudflareProjects"][number];

const CloudflareMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M16.5 16.8c.14-.5.09-.96-.16-1.3-.22-.31-.6-.5-1.05-.52l-8.6-.11a.17.17 0 0 1-.14-.07.18.18 0 0 1-.02-.15.23.23 0 0 1 .2-.16l8.69-.11c1.03-.05 2.14-.88 2.53-1.9l.5-1.3a.31.31 0 0 0 .01-.17A5.67 5.67 0 0 0 7.57 9.8a2.55 2.55 0 0 0-3.98 2.67A3.63 3.63 0 0 0 .05 16.1c0 .18.01.36.04.54a.17.17 0 0 0 .17.15h15.87a.22.22 0 0 0 .21-.16z" />
  </svg>
);

// Optional DNS-zone picker used in both import paths — stored on the project so
// the DNS tab manages that zone. We only read the user's Cloudflare DNS.
const DnsZoneSelect = ({
  accountId,
  value,
  onChange,
}: {
  accountId: string;
  value: string;
  onChange: (v: string) => void;
}) => {
  const trpc = useTRPC();
  const { data: zones } = useQuery(
    trpc.deploy.cfZones.queryOptions(
      { accountId },
      { enabled: !!accountId, retry: false }
    )
  );
  return (
    <div className="space-y-1.5">
      <Label>DNS zone (optional)</Label>
      <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
        <SelectTrigger className="h-8 w-full">
          <SelectValue placeholder="Pick a Cloudflare zone…" />
        </SelectTrigger>
        <SelectContent>
          {(zones ?? []).map((z) => (
            <SelectItem key={z.id} value={z.id}>
              {z.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-muted-foreground text-[12px]">
        We only read and show your Cloudflare DNS — nothing is changed.
      </p>
    </div>
  );
};

export const DeployButton = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="lg"
        className="from-primary to-primary/80 shadow-primary/30 hover:shadow-primary/40 gap-2 rounded-full bg-gradient-to-b px-7 text-[15px] font-semibold shadow-lg transition-shadow"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-5" />
        Import
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-background max-w-xl">
          <ImportWizard onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};

type Step = "source" | "github" | "cloudflare";

const ImportWizard = ({ onClose }: { onClose: () => void }) => {
  const trpc = useTRPC();
  const [step, setStep] = useState<Step>("source");

  const { data: conn, isLoading } = useQuery(
    trpc.deploy.connections.queryOptions()
  );

  if (isLoading || !conn) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="text-muted-foreground size-6" />
      </div>
    );
  }

  // Only block when NEITHER provider is connected. Otherwise proceed with the
  // one that's connected (GitHub-only import skips the optional Cloudflare DNS
  // step; Cloudflare-only import pulls the repo from the CF project).
  if (!conn.github && !conn.cloudflareReady) {
    return (
      <ConnectGate
        github={conn.github}
        cloudflare={conn.cloudflare}
        cloudflareReady={conn.cloudflareReady}
      />
    );
  }

  if (step === "github") {
    return (
      <GithubImport
        accountId={conn.cfAccounts[0]?.id ?? ""}
        onBack={() => setStep("source")}
        onClose={onClose}
      />
    );
  }
  if (step === "cloudflare") {
    return (
      <CloudflareImport
        accounts={conn.cfAccounts}
        onBack={() => setStep("source")}
        onClose={onClose}
      />
    );
  }
  return (
    <SourceStep
      onPick={setStep}
      github={conn.github}
      cloudflareReady={conn.cloudflareReady}
    />
  );
};

const SourceStep = ({
  onPick,
  github,
  cloudflareReady,
}: {
  onPick: (s: Step) => void;
  github: boolean;
  cloudflareReady: boolean;
}) => (
  <div>
    <DialogHeader>
      <DialogTitle>Import a project</DialogTitle>
      <DialogDescription>Where is your project?</DialogDescription>
    </DialogHeader>
    <div className="mt-4 grid grid-cols-2 gap-3">
      <SourceCard
        icon={<Github className="size-6" />}
        title="From GitHub"
        description="Pick a repo and set its domain."
        connected={github}
        provider="GitHub"
        onClick={() => onPick("github")}
      />
      <SourceCard
        icon={<CloudflareMark className="size-6 text-[#F38020]" />}
        title="From Cloudflare"
        description="Import an existing Workers or Pages project."
        connected={cloudflareReady}
        provider="Cloudflare"
        onClick={() => onPick("cloudflare")}
      />
    </div>
  </div>
);

const SourceCard = ({
  icon,
  title,
  description,
  connected,
  provider,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  connected: boolean;
  provider: string;
  onClick: () => void;
}) => {
  // A source is only usable when its provider is connected; otherwise the card
  // is disabled and points at the Integrations tab.
  if (!connected) {
    return (
      <a
        href="/integrations"
        className="border-dashed hover:border-foreground/30 flex flex-col items-start gap-2 rounded-lg border p-4 text-left opacity-70"
      >
        {icon}
        <span className="text-[14.5px] font-bold">{title}</span>
        <span className="text-muted-foreground text-[12.5px]">
          Connect {provider} to use this source.
        </span>
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:border-foreground/30 flex flex-col items-start gap-2 rounded-lg border p-4 text-left"
    >
      {icon}
      <span className="text-[14.5px] font-bold">{title}</span>
      <span className="text-muted-foreground text-[12.5px]">{description}</span>
    </button>
  );
};

const ConnectGate = ({
  github,
  cloudflare,
  cloudflareReady,
}: {
  github: boolean;
  cloudflare: boolean;
  cloudflareReady: boolean;
}) => {
  const cfState = cloudflareReady
    ? "connected"
    : cloudflare
      ? "reconnect"
      : "missing";
  return (
    <div>
      <DialogHeader>
        <DialogTitle>Connect to import</DialogTitle>
        <DialogDescription>
          Importing needs your GitHub and Cloudflare accounts connected.
        </DialogDescription>
      </DialogHeader>
      <div className="mt-4 space-y-2">
        <GateRow label="GitHub" state={github ? "connected" : "missing"} />
        <GateRow label="Cloudflare" state={cfState} />
      </div>
      <div className="mt-5 flex justify-end">
        <Button render={<a href="/integrations">Open Integrations</a>} />
      </div>
    </div>
  );
};

const GateRow = ({
  label,
  state,
}: {
  label: string;
  state: "connected" | "reconnect" | "missing";
}) => (
  <div className="flex items-center justify-between rounded-lg border px-4 py-3">
    <div className="flex items-center gap-2">
      <Blocks className="text-muted-foreground size-4" />
      <span className="text-[14px] font-semibold">{label}</span>
    </div>
    {state === "connected" ? (
      <Badge className="bg-status-success-bg text-status-success gap-1.5 rounded-full border-transparent px-3 py-1 text-[12.5px] font-semibold">
        <Check className="size-3" />
        Connected
      </Badge>
    ) : state === "reconnect" ? (
      <Badge variant="outline" className="gap-1.5 text-amber-600">
        <X className="size-3" />
        Reconnect needed
      </Badge>
    ) : (
      <Badge variant="outline" className="gap-1.5">
        <X className="size-3" />
        Not connected
      </Badge>
    )}
  </div>
);

// ─── Repo picker (shared) ────────────────────────────────────────

const RepoPicker = ({
  title,
  onPick,
  onBack,
}: {
  title: string;
  onPick: (r: Repo) => void;
  onBack: () => void;
}) => {
  const trpc = useTRPC();
  const [q, setQ] = useState("");
  const { data: repos, isLoading } = useQuery(
    trpc.deploy.githubRepos.queryOptions()
  );
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = repos ?? [];
    return term
      ? list.filter((r) => r.fullName.toLowerCase().includes(term))
      : list;
  }, [repos, q]);

  return (
    <div>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <Input
        value={q}
        placeholder="Search repositories…"
        className="mt-4"
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="text-muted-foreground size-5" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-[13.5px]">
            No repositories found.
          </p>
        ) : (
          filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onPick(r)}
              className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left"
            >
              <span className="flex-1 truncate text-[14px] font-medium">
                {r.fullName}
              </span>
              {r.private && (
                <LockKeyhole className="text-muted-foreground size-3.5 shrink-0" />
              )}
            </button>
          ))
        )}
      </div>
      <div className="mt-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
};

// ─── GitHub source ───────────────────────────────────────────────

const GithubImport = ({
  accountId,
  onBack,
  onClose,
}: {
  accountId: string;
  onBack: () => void;
  onClose: () => void;
}) => {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [repo, setRepo] = useState<Repo | null>(null);
  const [domain, setDomain] = useState("");
  const [dnsZoneId, setDnsZoneId] = useState("");

  const importMutation = useMutation(
    trpc.deploy.importGithub.mutationOptions({
      onSuccess: async (res) => {
        toast.success("Project imported.");
        await queryClient.invalidateQueries();
        onClose();
        router.push(repoPath(res.repo));
      },
      onError: (err) => toast.error(err.message),
    })
  );

  if (!repo) {
    return (
      <RepoPicker title="Import from GitHub" onPick={setRepo} onBack={onBack} />
    );
  }

  const host = domain.trim().toLowerCase();
  const canImport = /^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) && !importMutation.isPending;

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Import {repo.name}</DialogTitle>
        <DialogDescription>{repo.fullName}</DialogDescription>
      </DialogHeader>
      <div className="mt-4 space-y-1.5">
        <Label>Live domain</Label>
        <Input
          value={domain}
          placeholder="acme.com"
          onChange={(e) => setDomain(e.target.value)}
        />
        <p className="text-muted-foreground text-[12.5px]">
          Used to show a live preview of the site.
        </p>
      </div>
      {accountId && (
        <div className="mt-4">
          <DnsZoneSelect
            accountId={accountId}
            value={dnsZoneId}
            onChange={setDnsZoneId}
          />
        </div>
      )}
      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setRepo(null)}>
          Back
        </Button>
        <Button
          disabled={!canImport}
          isLoading={importMutation.isPending}
          onClick={() =>
            importMutation.mutate({
              repoFullName: repo.fullName,
              domain: host,
              dnsZoneId: dnsZoneId || null,
            })
          }
        >
          Import
        </Button>
      </div>
    </div>
  );
};

// ─── Cloudflare source ───────────────────────────────────────────

const CloudflareImport = ({
  accounts,
  onBack,
  onClose,
}: {
  accounts: { id: string; name: string }[];
  onBack: () => void;
  onClose: () => void;
}) => {
  const trpc = useTRPC();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [selected, setSelected] = useState<CfProject | null>(null);

  const { data: projects, isLoading, error } = useQuery(
    trpc.deploy.cloudflareProjects.queryOptions(
      { accountId },
      { enabled: !!accountId, retry: false }
    )
  );

  if (selected) {
    return (
      <CloudflareConfirm
        accountId={accountId}
        project={selected}
        onBack={() => setSelected(null)}
        onClose={onClose}
      />
    );
  }

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Import from Cloudflare</DialogTitle>
        <DialogDescription>Pick a project to import.</DialogDescription>
      </DialogHeader>

      {accounts.length > 1 && (
        <div className="mt-4">
          <Select value={accountId} onValueChange={(v) => setAccountId(v ?? "")}>
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="text-muted-foreground size-5" />
          </div>
        ) : error ? (
          <p className="text-destructive px-1 py-8 text-center text-[13px]">
            {error.message}
          </p>
        ) : (projects ?? []).length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-[13.5px]">
            No Cloudflare projects found.
          </p>
        ) : (
          (projects ?? []).map((p) => (
            <button
              key={`${p.type}:${p.name}`}
              type="button"
              onClick={() => setSelected(p)}
              className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">{p.name}</p>
                {p.url && (
                  <p className="text-muted-foreground truncate text-[12px]">
                    {p.url.replace(/^https?:\/\//, "")}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="shrink-0 capitalize">
                {p.type}
              </Badge>
            </button>
          ))
        )}
      </div>
      <div className="mt-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
};

const CloudflareConfirm = ({
  accountId,
  project,
  onBack,
  onClose,
}: {
  accountId: string;
  project: CfProject;
  onBack: () => void;
  onClose: () => void;
}) => {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [repo, setRepo] = useState<Repo | null>(null);
  const [pickingRepo, setPickingRepo] = useState(false);
  const [dnsZoneId, setDnsZoneId] = useState("");

  const { data: detail, isLoading } = useQuery(
    trpc.deploy.cloudflareProjectDetail.queryOptions({
      accountId,
      type: project.type,
      name: project.name,
    })
  );

  const importMutation = useMutation(
    trpc.deploy.importCloudflare.mutationOptions({
      onSuccess: async (res) => {
        toast.success("Project imported.");
        await queryClient.invalidateQueries();
        onClose();
        router.push(repoPath(res.repo));
      },
      onError: (err) => toast.error(err.message),
    })
  );

  // Pages carry their repo; Workers need the user to pick one.
  const repoFullName = project.repo
    ? `${project.repo.owner}/${project.repo.repo}`
    : (repo?.fullName ?? null);

  if (pickingRepo) {
    return (
      <RepoPicker
        title="Which GitHub repo is this?"
        onPick={(r) => {
          setRepo(r);
          setPickingRepo(false);
        }}
        onBack={() => setPickingRepo(false)}
      />
    );
  }

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Import {project.name}</DialogTitle>
        <DialogDescription>{project.url.replace(/^https?:\/\//, "")}</DialogDescription>
      </DialogHeader>

      <div className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <Label>GitHub repository</Label>
          {project.repo ? (
            <Input value={repoFullName ?? ""} disabled />
          ) : (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setPickingRepo(true)}
            >
              {repo ? repo.fullName : "Choose a repository…"}
            </Button>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Domains</Label>
          {isLoading ? (
            <Spinner className="text-muted-foreground size-4" />
          ) : (detail?.domains.length ?? 0) === 0 ? (
            <p className="text-muted-foreground text-[13px]">
              No custom domains — {project.url.replace(/^https?:\/\//, "")} will be
              used.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {detail?.domains.map((d) => (
                <Badge key={d} variant="outline">
                  {d}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <DnsZoneSelect
          accountId={accountId}
          value={dnsZoneId}
          onChange={setDnsZoneId}
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          disabled={!repoFullName || isLoading || importMutation.isPending}
          isLoading={importMutation.isPending}
          onClick={() =>
            repoFullName &&
            importMutation.mutate({
              accountId,
              type: project.type,
              name: project.name,
              repoFullName,
              url: project.url,
              previewUrl: detail?.previewUrl ?? null,
              domains: detail?.domains ?? [],
              dnsZoneId: dnsZoneId || null,
            })
          }
        >
          Import
        </Button>
      </div>
    </div>
  );
};
