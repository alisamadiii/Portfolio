"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Code, Download, GitBranch, Lock } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";

import { PageHeader } from "@/components/ds/layout/page-header";
import { Button } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { Input } from "@/components/ds/ui/field";
import { EmptyState } from "@/components/ds/ui/misc";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useRouteProjectId } from "@/hooks/use-repo";
import { handleCmsError } from "@/lib/trpc-errors";

/**
 * Source Code: clients who bought Website Setup own their code and can
 * download it any time. It's the project's backup repo in the private GitHub
 * org; when none is linked yet, admins pick one from that org.
 */
export function SourceCodePage() {
  const trpc = useTRPC();
  const projectId = useRouteProjectId();
  const status = useQuery(trpc.project.sourceCodeRepo.queryOptions({ projectId }, { retry: false }));

  const download = useMutation(
    trpc.project.downloadSourceCode.mutationOptions({
      onSuccess: ({ url }) => window.location.assign(url),
      onError: (error) => toast.error(handleCmsError(error, "Couldn't prepare the download.")),
    })
  );

  const header = (
    <PageHeader title="Source Code" description="Your website's full code. It's yours, download it whenever you want." />
  );

  if (status.isPending) {
    return (
      <>
        {header}
        <Skeleton className="h-[140px] rounded-card" />
      </>
    );
  }
  if (status.isError) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            icon={<Lock className="size-5" />}
            title="Source code isn't available"
            text={handleCmsError(status.error, "Couldn't load your source code.")}
          />
        </Card>
      </>
    );
  }

  const { repo, canLink } = status.data;

  return (
    <>
      {header}
      {repo ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
          <div className="flex flex-col gap-1">
            <span className="text-[15px] font-semibold">Download your code</span>
            <p className="text-[13px] text-dim">
              A .zip of the latest published version of your site
              {repo.pushedAt && `, updated ${formatDistanceToNow(parseISO(repo.pushedAt), { addSuffix: true })}`}.
            </p>
          </div>
          <Button
            variant="primary"
            icon={<Download className="size-4" />}
            disabled={download.isPending}
            onClick={() => download.mutate({ projectId })}
          >
            {download.isPending ? "Preparing…" : "Download .zip"}
          </Button>
        </Card>
      ) : (
        !canLink && (
          <Card>
            <EmptyState
              icon={<Code className="size-5" />}
              title="Your code is being prepared"
              text="It shows up here after your site's next update. Check back soon."
            />
          </Card>
        )
      )}
      {canLink && <LinkRepoCard projectId={projectId} linkedId={repo?.id ?? null} />}
    </>
  );
}

/** Admin: link a repo from the backup GitHub org to this project. */
function LinkRepoCard({ projectId, linkedId }: { projectId: string; linkedId: number | null }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(linkedId == null);
  const repos = useQuery(trpc.project.backupRepos.queryOptions(undefined, { enabled: open, retry: false }));

  const link = useMutation(
    trpc.project.linkBackupRepo.mutationOptions({
      onSuccess: (repo) => {
        if (repo.pushed) toast.success(`Linked ${repo.name}. Pushing the latest code there now.`);
        else toast.warning(`Linked ${repo.name}, but the code couldn't be pushed yet. It goes there on the next publish.`);
        setOpen(false);
        void queryClient.invalidateQueries({ queryKey: trpc.project.sourceCodeRepo.pathKey() });
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't link the repository.")),
    })
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (repos.data ?? []).filter((r) => !q || r.name.toLowerCase().includes(q));
  }, [repos.data, search]);

  if (!open) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
        <div className="flex flex-col gap-1">
          <span className="text-[15px] font-semibold">Linked repository</span>
          <p className="text-[13px] text-dim">Admins only. Change which backup repo this project downloads.</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          Change
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Link a repository"
        divided
        action={
          linkedId != null && (
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          )
        }
      />
      <div className="flex flex-col gap-3 px-6 py-5">
        <p className="text-[13px] text-dim">
          {linkedId == null
            ? "This project isn't linked to a backup repo yet. Pick its repo from the GitHub organization. Admins only."
            : "Pick the backup repo this project downloads. Admins only."}
        </p>
        <Input placeholder="Search repositories" value={search} onChange={(e) => setSearch(e.target.value)} />
        {repos.isPending ? (
          <Skeleton className="h-[200px] rounded-inner" />
        ) : repos.isError ? (
          <p className="text-[13px] text-danger">{handleCmsError(repos.error, "Couldn't load repositories.")}</p>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-dim">No repositories found.</p>
        ) : (
          <ul className="flex max-h-[360px] flex-col divide-y divide-divider overflow-y-auto rounded-inner border border-line">
            {filtered.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-2 truncate text-sm text-ink">
                    <GitBranch className="size-3.5 shrink-0 text-dim" />
                    {r.name}
                  </span>
                  {r.pushedAt && (
                    <span className="text-[12px] text-dim">
                      Updated {formatDistanceToNow(parseISO(r.pushedAt), { addSuffix: true })}
                    </span>
                  )}
                </span>
                {r.id === linkedId ? (
                  <span className="text-[13px] text-dim">Linked</span>
                ) : (
                  <Button
                    size="sm"
                    disabled={link.isPending}
                    onClick={() => link.mutate({ projectId, repoId: r.id })}
                  >
                    Link
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
