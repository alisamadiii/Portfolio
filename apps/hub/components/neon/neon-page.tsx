"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Check, Copy, Database, ExternalLink, Eye, Plus } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";

import { authClient } from "@workspace/auth/auth-client";
import { useTRPC } from "@workspace/trpc/client";
import { NEON_REGIONS } from "@workspace/trpc/lib/neon-regions";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
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
import { handleCmsError } from "@/lib/trpc-errors";

type Overview = RouterOutputs["neon"]["overview"];
type Branch = Overview["branches"][number];
type NeonProject = RouterOutputs["neon"]["projects"][number];

const ago = (iso: string | null) =>
  iso ? formatDistanceToNow(parseISO(iso), { addSuffix: true }) : "—";

const bytes = (n: number | null) => {
  if (n == null) return "—";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
};

const regionLabel = (id: string) => NEON_REGIONS.find((r) => r.id === id)?.label ?? id;

const computeBadge = (state: string | null): { tone: BadgeTone; label: string } => {
  if (state === "active") return { tone: "success", label: "Active" };
  if (state === "idle") return { tone: "neutral", label: "Idle" };
  if (state === "init") return { tone: "info", label: "Starting" };
  return { tone: "neutral", label: "—" };
};

/** Project Neon app: connect the client's Neon, bind a project, see branches + databases. */
export function NeonPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const project = useProject();
  const fullAccess = project?.role === "full-access";
  const [returned, setReturned] = useQueryState("neon", parseAsString);
  const [confirming, setConfirming] = useState<"disconnect" | "unbind" | null>(null);

  const status = useQuery(trpc.neon.status.queryOptions({ projectId }));
  const connected = !!status.data?.connected;
  const bound = connected && !!status.data?.neonProjectId;

  const refresh = () => void queryClient.invalidateQueries({ queryKey: trpc.neon.pathKey() });

  const connect = useMutation(
    trpc.neon.connect.mutationOptions({
      onSuccess: () => {
        toast.success("Neon connected.");
        refresh();
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't connect Neon.")),
    })
  );
  const disconnect = useMutation(
    trpc.neon.disconnect.mutationOptions({
      onSuccess: refresh,
      onError: (error) => toast.error(handleCmsError(error, "Couldn't disconnect Neon.")),
    })
  );
  const unbind = useMutation(
    trpc.neon.unbindProject.mutationOptions({
      onSuccess: refresh,
      onError: (error) => toast.error(handleCmsError(error, "Couldn't change the project.")),
    })
  );

  // Back from Neon's consent screen: bind the freshly linked account.
  useEffect(() => {
    if (returned !== "connected" || !status.data) return;
    void setReturned(null);
    if (!status.data.connected && fullAccess) connect.mutate({ projectId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returned, status.data, fullAccess]);

  const startConnect = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("neon", "connected");
    const { error } = await authClient.oauth2.link({
      providerId: "neon",
      callbackURL: url.toString(),
      errorCallbackURL: connectErrorURL("Neon"),
    });
    if (error) toast.error(error.message ?? "Couldn't start Neon sign-in.");
  };

  const header = (
    <PageHeader
      title="Neon"
      description="Your website's Postgres database: branches, databases and connection strings."
      actions={
        connected && fullAccess ? (
          <div className="flex gap-2">
            {bound && (
              <Button onClick={() => setConfirming("unbind")} disabled={unbind.isPending}>
                Change project
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => setConfirming("disconnect")}
              disabled={disconnect.isPending}
            >
              {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
            </Button>
          </div>
        ) : undefined
      }
    />
  );
  const dialogs = (
    <>
      <ConfirmDialog
        open={confirming === "disconnect"}
        onOpenChange={(open) => !open && setConfirming(null)}
        title="Disconnect Neon?"
        description="The hub loses access to this Neon account. Your Neon projects and databases are not touched, and websites using them keep working."
        confirmLabel="Disconnect"
        danger
        onConfirm={() => disconnect.mutate({ projectId })}
      />
      <ConfirmDialog
        open={confirming === "unbind"}
        onOpenChange={(open) => !open && setConfirming(null)}
        title="Use a different Neon project?"
        description="This project is unlinked from the hub only. Nothing is deleted in Neon."
        confirmLabel="Change project"
        onConfirm={() => unbind.mutate({ projectId })}
      />
    </>
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
            icon={<Database className="size-5" />}
            title="Connect your Neon account"
            text={
              fullAccess
                ? "Connect Neon so we can set up and manage your website's database. You won't need to share your password."
                : "The site owner hasn't connected Neon yet."
            }
            action={
              fullAccess && (
                <Button
                  variant="primary"
                  onClick={() => void startConnect()}
                  disabled={connect.isPending}
                >
                  Connect Neon
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
      {dialogs}
      {bound ? (
        <BoundProject fullAccess={fullAccess} onReconnect={() => void startConnect()} />
      ) : fullAccess ? (
        <ProjectPicker onReconnect={() => void startConnect()} />
      ) : (
        <Card>
          <EmptyState
            icon={<Database className="size-5" />}
            title="No Neon project yet"
            text="The site owner hasn't chosen a Neon project for this site."
          />
        </Card>
      )}
    </div>
  );
}

function LoadError({ error, onReconnect }: { error: unknown; onReconnect: () => void }) {
  return (
    <Card>
      <EmptyState
        icon={<Database className="size-5" />}
        title="Couldn't load Neon"
        text={handleCmsError(error, "Neon didn't answer. Try again in a moment.")}
        action={
          <Button variant="primary" onClick={onReconnect}>
            Reconnect Neon
          </Button>
        }
      />
    </Card>
  );
}

/** Connected, no project yet: pick one of the client's Neon projects or create one. */
function ProjectPicker({ onReconnect }: { onReconnect: () => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const projectName = useProject()?.repo ?? "website";
  const orgs = useQuery(trpc.neon.orgs.queryOptions({ projectId }, { retry: false }));
  const [orgPick, setOrgPick] = useState("");
  const orgId = orgPick || orgs.data?.[0]?.id || undefined;
  const projects = useQuery(
    trpc.neon.projects.queryOptions({ projectId, orgId }, { enabled: orgs.isSuccess, retry: false })
  );
  const [choosing, setChoosing] = useState<NeonProject | null>(null);
  const [creating, setCreating] = useState(false);

  const done = () => void queryClient.invalidateQueries({ queryKey: trpc.neon.pathKey() });
  const bind = useMutation(
    trpc.neon.bindProject.mutationOptions({
      onSuccess: () => {
        toast.success("Neon project linked.");
        done();
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't link that project.")),
    })
  );

  if (orgs.isError) return <LoadError error={orgs.error} onReconnect={onReconnect} />;
  if (projects.isError) return <LoadError error={projects.error} onReconnect={onReconnect} />;

  const columns: Column<NeonProject>[] = [
    {
      key: "name",
      header: "Project",
      width: "minmax(200px, 2fr)",
      cell: (p) => <span className="truncate font-medium text-ink">{p.name}</span>,
    },
    { key: "region", header: "Region", width: "minmax(160px, 1fr)", cell: (p) => regionLabel(p.regionId) },
    { key: "created", header: "Created", width: "140px", cell: (p) => ago(p.createdAt) },
    {
      key: "use",
      header: "",
      width: "150px",
      align: "end",
      cell: (p) =>
        p.linkedTo ? (
          <span className="text-[13px] text-dim">Used by {p.linkedTo}</span>
        ) : (
          <Button size="sm" onClick={() => setChoosing(p)} disabled={bind.isPending}>
            Use this project
          </Button>
        ),
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Choose a Neon project"
        divided
        action={
          <Button
            size="sm"
            variant="primary"
            icon={<Plus className="size-4" />}
            onClick={() => setCreating(true)}
            disabled={!orgs.isSuccess}
          >
            New project
          </Button>
        }
      />
      {(orgs.data?.length ?? 0) > 1 && (
        <div className="border-b border-divider px-6 py-4">
          <Field label="Organization" className="max-w-[320px]">
            <Select value={orgId ?? ""} onChange={(e) => setOrgPick(e.target.value)}>
              {orgs.data!.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}
      {orgs.isPending || projects.isPending ? (
        <Skeleton className="m-6 h-[160px]" />
      ) : (
        <DataTable
          columns={columns}
          rows={projects.data}
          rowKey={(p) => p.id}
          minWidth={620}
          empty={
            <p className="px-6 py-8 text-center text-[13px] text-dim">
              No projects in this Neon account yet. Create one to get started.
            </p>
          }
        />
      )}
      <ConfirmDialog
        open={!!choosing}
        onOpenChange={(open) => !open && setChoosing(null)}
        title={<>Use &ldquo;{choosing?.name}&rdquo;?</>}
        description="The hub reads this Neon project's branches and databases for this site. Nothing in Neon is changed."
        confirmLabel="Use this project"
        onConfirm={() => {
          if (choosing) bind.mutate({ projectId, neonProjectId: choosing.id, orgId });
        }}
      />
      {creating && (
        <CreateProjectDialog
          orgId={orgId}
          defaultName={projectName}
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            done();
          }}
        />
      )}
    </Card>
  );
}

function CreateProjectDialog({
  orgId,
  defaultName,
  onClose,
  onDone,
}: {
  orgId: string | undefined;
  defaultName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const trpc = useTRPC();
  const projectId = useRouteProjectId();
  const [name, setName] = useState(defaultName.slice(0, 64));
  const [regionId, setRegionId] = useState<string>(NEON_REGIONS[0].id);
  const create = useMutation(
    trpc.neon.createProject.mutationOptions({
      onSuccess: () => {
        toast.success("Neon project created and linked.");
        onDone();
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't create the project.")),
    })
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>New Neon project</DialogTitle>
          <DialogDescription>
            Created in your Neon account with Postgres 17, then linked to this site. Neon&apos;s
            plan limits and pricing apply.
          </DialogDescription>
        </DialogHeader>
        <form
          id="neon-create"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.mutate({ projectId, name: name.trim(), regionId, orgId });
          }}
        >
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={64} />
          </Field>
          <Field label="Region" hint="Pick the one closest to where the website is hosted.">
            <Select value={regionId} onChange={(e) => setRegionId(e.target.value)}>
              {NEON_REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
        </form>
        <DialogFooter>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            form="neon-create"
            variant="primary"
            disabled={!name.trim() || create.isPending}
          >
            {create.isPending ? "Creating…" : "Create project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Bound: project summary, branches, databases and the connection string. */
function BoundProject({ fullAccess, onReconnect }: { fullAccess: boolean; onReconnect: () => void }) {
  const trpc = useTRPC();
  const projectId = useRouteProjectId();
  const overview = useQuery(trpc.neon.overview.queryOptions({ projectId }, { retry: false }));
  const [branchPick, setBranchPick] = useState("");

  if (overview.isError) return <LoadError error={overview.error} onReconnect={onReconnect} />;
  if (overview.isPending) return <Skeleton className="h-[320px] rounded-card" />;

  const data = overview.data;
  const branchId = branchPick || data.branches[0]?.id || "";

  const columns: Column<Branch>[] = [
    {
      key: "name",
      header: "Branch",
      width: "minmax(180px, 2fr)",
      cell: (b) => (
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-ink">{b.name}</span>
          {b.isDefault && <Badge tone="info">Default</Badge>}
        </span>
      ),
    },
    {
      key: "compute",
      header: "Compute",
      width: "120px",
      cell: (b) => {
        const c = computeBadge(b.compute);
        return (
          <Badge tone={c.tone} dot>
            {c.label}
          </Badge>
        );
      },
    },
    { key: "size", header: "Size", width: "110px", cell: (b) => bytes(b.sizeBytes) },
    { key: "created", header: "Created", width: "140px", align: "end", cell: (b) => ago(b.createdAt) },
  ];

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-6 py-5">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-[16px] font-semibold text-ink">{data.name}</span>
            <span className="text-[13px] text-dim">
              {regionLabel(data.regionId)} · Postgres {data.pgVersion} · Storage {bytes(data.storageBytes)}
            </span>
          </div>
          <ButtonAnchor
            href={`https://console.neon.tech/app/projects/${data.id}`}
            target="_blank"
            rel="noreferrer"
            icon={<ExternalLink className="size-4" />}
          >
            Open in Neon
          </ButtonAnchor>
        </div>
      </Card>
      <Card>
        <CardHeader title="Branches" divided />
        <DataTable
          columns={columns}
          rows={data.branches}
          rowKey={(b) => b.id}
          minWidth={560}
          onRowClick={(b) => setBranchPick(b.id)}
          empty={<p className="px-6 py-8 text-center text-[13px] text-dim">No branches yet.</p>}
        />
      </Card>
      {branchId && (
        <DatabasesCard
          key={branchId}
          branches={data.branches}
          branchId={branchId}
          onBranch={setBranchPick}
          fullAccess={fullAccess}
        />
      )}
    </>
  );
}

function DatabasesCard({
  branches,
  branchId,
  onBranch,
  fullAccess,
}: {
  branches: Branch[];
  branchId: string;
  onBranch: (id: string) => void;
  fullAccess: boolean;
}) {
  const trpc = useTRPC();
  const projectId = useRouteProjectId();
  const dbs = useQuery(trpc.neon.databases.queryOptions({ projectId, branchId }, { retry: false }));
  const [dbPick, setDbPick] = useState("");
  const [rolePick, setRolePick] = useState("");
  const [pooled, setPooled] = useState(true);
  const [uri, setUri] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmReveal, setConfirmReveal] = useState(false);

  const database = dbs.data?.databases.find((d) => d.name === dbPick) ?? dbs.data?.databases[0];
  const roleName = rolePick || database?.owner || dbs.data?.roles[0] || "";

  const reveal = useMutation(
    trpc.neon.connectionString.mutationOptions({
      onSuccess: (result) => {
        setUri(result.uri);
        setShown(true);
        setCopied(false);
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't get the connection string.")),
    })
  );

  const reset = () => {
    setUri(null);
    setShown(false);
  };
  const masked = uri?.replace(/:\/\/([^:]+):[^@]+@/, "://$1:••••••••@");

  return (
    <Card>
      <CardHeader title="Databases" divided />
      <div className="flex flex-col gap-4 px-6 py-5">
        {branches.length > 1 && (
          <Field label="Branch" className="max-w-[320px]">
            <Select value={branchId} onChange={(e) => onBranch(e.target.value)}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {dbs.isPending ? (
          <Skeleton className="h-[80px]" />
        ) : dbs.isError ? (
          <p className="text-[13px] text-dim">{handleCmsError(dbs.error, "Couldn't load the databases.")}</p>
        ) : dbs.data.databases.length === 0 ? (
          <p className="text-[13px] text-dim">No databases on this branch yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-divider rounded-control border border-line text-[13px]">
            {dbs.data.databases.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="font-medium text-ink">{d.name}</span>
                <span className="text-dim">Owner {d.owner}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {fullAccess && dbs.data && dbs.data.databases.length > 0 && (
        <div className="flex flex-col gap-4 border-t border-divider px-6 py-5">
          <span className="text-[13px] font-semibold text-ink">Connection string</span>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Database" className="min-w-[160px] flex-1">
              <Select
                value={database?.name ?? ""}
                onChange={(e) => {
                  setDbPick(e.target.value);
                  setRolePick("");
                  reset();
                }}
              >
                {dbs.data.databases.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Role" className="min-w-[160px] flex-1">
              <Select
                value={roleName}
                onChange={(e) => {
                  setRolePick(e.target.value);
                  reset();
                }}
              >
                {dbs.data.roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
            <label className="flex h-9 items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={pooled}
                onChange={(e) => {
                  setPooled(e.target.checked);
                  reset();
                }}
                className="size-4 accent-coral"
              />
              Pooled
            </label>
            <Button
              variant="primary"
              icon={<Eye className="size-4" />}
              disabled={!database || !roleName || reveal.isPending}
              onClick={() => setConfirmReveal(true)}
            >
              {reveal.isPending ? "Loading…" : "Show"}
            </Button>
          </div>
          {uri && (
            <div className="flex flex-wrap items-center gap-3 rounded-control border border-line bg-sidebar px-3 py-2">
              <code className="min-w-0 flex-1 truncate text-[13px] text-ink">{shown ? uri : masked}</code>
              <Button size="sm" onClick={() => setShown(!shown)}>
                {shown ? "Hide" : "Show"}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(uri);
                  setCopied(true);
                }}
                icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          )}
          <p className="text-[12px] text-dim">
            Pooled suits websites and serverless functions. Use unpooled for migrations.
          </p>
        </div>
      )}
      <ConfirmDialog
        open={confirmReveal}
        onOpenChange={setConfirmReveal}
        title="Show the connection string?"
        description="It includes the database password. Anyone who sees it can read and change this database, so only share it with your developer."
        confirmLabel="Show it"
        onConfirm={() =>
          database &&
          reveal.mutate({ projectId, branchId, databaseName: database.name, roleName, pooled })
        }
      />
    </Card>
  );
}
