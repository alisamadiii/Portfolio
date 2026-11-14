"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { Badge } from "@/components/ds/ui/badge";
import { Button, ButtonLink } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { useInstalledApps } from "@/hooks/use-installed-apps";
import { useProject } from "@/hooks/use-project";
import { useRouteProjectId } from "@/hooks/use-repo";
import { roleAtLeast } from "@/lib/authz-shared";
import { repoPath } from "@/lib/paths";
import { handleCmsError } from "@/lib/trpc-errors";

type Submission = RouterOutputs["wix"]["forms"]["list"][number];

const ago = (iso: string | null) =>
  iso ? formatDistanceToNow(parseISO(iso), { addSuffix: true }) : "—";

const columns: Column<Submission>[] = [
  {
    key: "who",
    header: "From",
    width: "minmax(180px, 2fr)",
    cell: (s) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-ink">{s.name ?? s.email ?? s.phone ?? "—"}</span>
        {s.name && (s.email || s.phone) && (
          <span className="truncate text-[12px] text-dim">{s.email ?? s.phone}</span>
        )}
      </span>
    ),
  },
  { key: "form", header: "Form", width: "minmax(140px, 1fr)", cell: (s) => s.form ?? "—" },
  { key: "when", header: "Sent", width: "140px", cell: (s) => ago(s.createdAt) },
  {
    key: "imported",
    header: "",
    width: "110px",
    align: "end",
    cell: (s) => (s.imported ? <Badge tone="success">In Leads</Badge> : null),
  },
];

/** Wix Forms submissions, imported into the hub's Leads inbox on demand. */
export function WixLeads() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const role = useProject()?.role ?? null;
  const canEdit = !!role && roleAtLeast(role, "content-editor");
  const { isInstalled, install, isPending: installing } = useInstalledApps(projectId);
  const leadsInstalled = isInstalled("leads");
  const submissions = useQuery(trpc.wix.forms.list.queryOptions({ projectId }, { retry: false }));
  const [confirming, setConfirming] = useState(false);
  const waiting = (submissions.data ?? []).filter((s) => !s.imported).length;

  const sync = useMutation(
    trpc.wix.forms.syncToLeads.mutationOptions({
      onSuccess: ({ imported }) => {
        toast.success(
          imported ? `${imported} new lead${imported === 1 ? "" : "s"} added to Leads.` : "Leads is already up to date."
        );
        void queryClient.invalidateQueries({ queryKey: trpc.wix.forms.pathKey() });
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't import the leads.")),
    })
  );

  return (
    <Card>
      <CardHeader
        title="Form submissions"
        divided
        action={
          canEdit &&
          (leadsInstalled ? (
            <div className="flex gap-2">
              <ButtonLink size="sm" href={repoPath(projectId, "leads")}>
                Open Leads
              </ButtonLink>
              <Button
                size="sm"
                variant="primary"
                icon={<Download className="size-4" />}
                disabled={sync.isPending || waiting === 0}
                onClick={() => setConfirming(true)}
              >
                {sync.isPending ? "Importing…" : `Import to Leads${waiting ? ` (${waiting})` : ""}`}
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="primary"
              disabled={installing}
              onClick={() => install("leads")}
            >
              {installing ? "Adding…" : "Add the Leads app"}
            </Button>
          ))
        }
      />
      {!leadsInstalled && (
        <p className="border-b border-divider px-6 py-3 text-[13px] text-dim">
          Add the Leads app to bring these submissions into your leads inbox, with status and
          follow-ups.
        </p>
      )}
      {submissions.isPending ? (
        <Skeleton className="m-6 h-[200px]" />
      ) : submissions.isError ? (
        <p className="px-6 py-6 text-[13px] text-dim">
          {handleCmsError(submissions.error, "Couldn't load the submissions.")}
        </p>
      ) : (
        <DataTable
          columns={columns}
          rows={submissions.data}
          rowKey={(s) => s.id}
          minWidth={560}
          empty={<p className="px-6 py-8 text-center text-[13px] text-dim">No form submissions yet.</p>}
        />
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Import ${waiting} submission${waiting === 1 ? "" : "s"} to Leads?`}
        description="Each one becomes a new lead in your inbox. Submissions already imported are skipped."
        confirmLabel="Import"
        onConfirm={() => sync.mutate({ projectId })}
      />
    </Card>
  );
}
