"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

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
import {
  HOSTING_LABELS,
  HOSTING_VALUES,
  type Hosting,
  isExternalHosting,
} from "@workspace/trpc/lib/hosting";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { FolderUp, LockKeyhole, Plus } from "@/components/icon";
import { UploadImport } from "@/components/deploy/upload-import";
import { isAdminUser } from "@/lib/authz-shared";
import { repoPath } from "@/lib/paths";
import { useUser } from "@/contexts/user-context";

type Repo = RouterOutputs["deploy"]["installationRepos"][number];

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
  const [source, setSource] = useState<"github" | "upload" | null>(null);

  const { data: installations, isLoading } = useQuery(
    trpc.deploy.installations.queryOptions()
  );

  if (source === "upload") {
    return <UploadImport onBack={() => setSource(null)} onClose={onClose} />;
  }

  if (source === "github") {
    if (isLoading || !installations) {
      return (
        <div className="flex justify-center py-16">
          <Spinner className="text-muted-foreground size-6" />
        </div>
      );
    }
    if (!installations.length) {
      return <ConnectGate />;
    }
    return <GithubImport onClose={onClose} />;
  }

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Import a project</DialogTitle>
        <DialogDescription>
          Connect a GitHub repository, or upload your site's files directly.
        </DialogDescription>
      </DialogHeader>
      <div className="mt-5 grid gap-2">
        <button
          type="button"
          onClick={() => setSource("github")}
          className="hover:bg-muted flex items-center gap-3 rounded-lg border px-4 py-3.5 text-left"
        >
          <Github className="size-5 shrink-0" />
          <span>
            <span className="block text-[14px] font-medium">
              Import from GitHub
            </span>
            <span className="text-muted-foreground block text-[12.5px]">
              An Astro, Vite, or plain HTML repo the GitHub App is on.
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setSource("upload")}
          className="hover:bg-muted flex items-center gap-3 rounded-lg border px-4 py-3.5 text-left"
        >
          <FolderUp className="size-5 shrink-0" />
          <span>
            <span className="block text-[14px] font-medium">
              Upload a folder or zip
            </span>
            <span className="text-muted-foreground block text-[12.5px]">
              No GitHub needed. Astro, Vite, or plain HTML sites.
            </span>
          </span>
        </button>
      </div>
    </div>
  );
};

const ConnectGate = () => {
  const trpc = useTRPC();
  const { data: install } = useQuery(trpc.deploy.appInstallUrl.queryOptions());
  return (
    <div>
      <DialogHeader>
        <DialogTitle>Install the GitHub App</DialogTitle>
        <DialogDescription>
          Install our GitHub App on the repository you want to import. It only
          needs access to the repositories you pick.
        </DialogDescription>
      </DialogHeader>
      <div className="mt-5 flex justify-end">
        {install?.url ? (
          <Button
            render={
              <a href={install.url} target="_blank" rel="noopener noreferrer">
                <Github className="size-4" />
                Install GitHub App
              </a>
            }
          />
        ) : (
          <p className="text-muted-foreground text-[13.5px]">
            The GitHub App is not configured on this server.
          </p>
        )}
      </div>
    </div>
  );
};

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
  const { data: installations } = useQuery(
    trpc.deploy.installations.queryOptions()
  );
  const { data: install } = useQuery(trpc.deploy.appInstallUrl.queryOptions());
  // One repo list per linked installation, deduped by repo id.
  const installationRepoQueries = useQueries({
    queries: (installations ?? []).map((inst) =>
      trpc.deploy.installationRepos.queryOptions({
        installationId: inst.installationId,
      })
    ),
  });
  const isLoading = installationRepoQueries.some((query) => query.isLoading);

  const filtered = useMemo(() => {
    const seen = new Set<number>();
    const list: Repo[] = [];
    for (const query of installationRepoQueries) {
      for (const repo of query.data ?? []) {
        if (seen.has(repo.id)) continue;
        seen.add(repo.id);
        list.push(repo);
      }
    }
    const term = q.trim().toLowerCase();
    return term
      ? list.filter((r) => r.fullName.toLowerCase().includes(term))
      : list;
  }, [installationRepoQueries, q]);

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
          <div className="py-8 text-center">
            <p className="text-muted-foreground text-[13.5px]">
              No repositories found.
            </p>
            {install?.url && (
              <a
                href={install.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary mt-2 inline-block text-[13px] font-medium hover:underline"
              >
                Install the GitHub App on more repositories
              </a>
            )}
          </div>
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
      {filtered.length > 0 && install?.url && (
        <a
          href={install.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground mt-3 block text-center text-[12.5px]"
        >
          Repository missing? Install the GitHub App on it.
        </a>
      )}
    </div>
  );
};

// ─── GitHub import ───────────────────────────────────────────────

const GithubImport = ({ onClose }: { onClose: () => void }) => {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const isAdmin = isAdminUser(user);
  const [repo, setRepo] = useState<Repo | null>(null);
  const [hosting, setHosting] = useState<Hosting>("content-pilot");
  const [websiteUrl, setWebsiteUrl] = useState("");

  const importMutation = useMutation(
    trpc.deploy.importGithub.mutationOptions({
      onSuccess: async (res) => {
        toast.success("Project imported.");
        await queryClient.invalidateQueries();
        onClose();
        router.push(repoPath(res.repoId));
      },
      onError: (err) => toast.error(err.message),
    })
  );

  if (!repo) {
    return <RepoPicker title="Import from GitHub" onPick={setRepo} />;
  }

  const external = isExternalHosting(hosting);
  const canImport =
    !importMutation.isPending && (!external || websiteUrl.trim().length > 0);

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Import {repo.name}</DialogTitle>
        <DialogDescription>{repo.fullName}</DialogDescription>
      </DialogHeader>

      {isAdmin && (
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label>Where is the live site hosted?</Label>
            <Select
              value={hosting}
              onValueChange={(value) =>
                setHosting((value as Hosting) ?? "content-pilot")
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue>
                  {(v) =>
                    v === "other" ? "Other" : HOSTING_LABELS[v as Hosting]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {HOSTING_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value === "other" ? "Other" : HOSTING_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {external && (
            <div className="space-y-1.5">
              <Label>Live website</Label>
              <Input
                value={websiteUrl}
                placeholder="www.example.com"
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      <p className="text-muted-foreground mt-4 text-[13px]">
        {external
          ? `Every publish pushes the changes to GitHub and ${HOSTING_LABELS[hosting]} deploys them. It must be an Astro, Vite, or plain HTML site.`
          : "We host the site for you. It must be an Astro, Vite, or plain HTML site. Every publish builds it and pushes the changes to GitHub."}
      </p>
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
              ...(isAdmin ? { hosting, websiteUrl } : {}),
            })
          }
        >
          Import
        </Button>
      </div>
    </div>
  );
};
