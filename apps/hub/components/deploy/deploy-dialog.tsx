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
import { Spinner } from "@workspace/ui/components/spinner";
import { Github } from "@workspace/ui/icons/social";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { Blocks, Check, LockKeyhole, Plus, X } from "@/components/icon";
import { repoPath } from "@/lib/paths";

type Repo = RouterOutputs["deploy"]["githubRepos"][number];

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

const ImportWizard = ({ onClose }: { onClose: () => void }) => {
  const trpc = useTRPC();

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

  if (!conn.github) {
    return <ConnectGate github={conn.github} />;
  }

  return <GithubImport onClose={onClose} />;
};

const ConnectGate = ({ github }: { github: boolean }) => (
  <div>
    <DialogHeader>
      <DialogTitle>Connect to import</DialogTitle>
      <DialogDescription>
        Importing needs your GitHub account connected.
      </DialogDescription>
    </DialogHeader>
    <div className="mt-4 space-y-2">
      <GateRow label="GitHub" state={github ? "connected" : "missing"} />
    </div>
    <div className="mt-5 flex justify-end">
      <Button render={<a href="/integrations">Open Integrations</a>} />
    </div>
  </div>
);

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

// ─── Repo picker ─────────────────────────────────────────────────

const RepoPicker = ({
  title,
  onPick,
}: {
  title: string;
  onPick: (r: Repo) => void;
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
    </div>
  );
};

// ─── GitHub import ───────────────────────────────────────────────

const GithubImport = ({ onClose }: { onClose: () => void }) => {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [repo, setRepo] = useState<Repo | null>(null);
  const [domain, setDomain] = useState("");

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
    return <RepoPicker title="Import from GitHub" onPick={setRepo} />;
  }

  const host = domain.trim().toLowerCase();
  const canImport =
    /^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) && !importMutation.isPending;

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
          The project's website URL — used to show a live preview of the site.
        </p>
      </div>
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
            })
          }
        >
          Import
        </Button>
      </div>
    </div>
  );
};
