"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { Mail, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";
import { useTRPC } from "@workspace/trpc/client";
import {
  assignableRoles,
  canManageMember,
  INVITE_BATCH_MAX,
} from "@workspace/trpc/lib/cms/members-shared";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { PageHeader } from "@/components/ds/layout/page-header";
import { Badge } from "@/components/ds/ui/badge";
import { Button } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { Field, Input, Select } from "@/components/ds/ui/field";
import { EmptyState } from "@/components/ds/ui/misc";
import { useRouteProjectId } from "@/hooks/use-repo";
import type { CollaboratorRole } from "@/lib/authz-shared";
import { handleCmsError } from "@/lib/trpc-errors";
import { getInitialsFromName } from "@/lib/utils/avatar";

type Members = RouterOutputs["cms"]["collaborators"]["members"];
type Collaborator = Members["collaborators"][number];

type Person = { key: string; name: string | null; email: string; image: string | null; userId: string };
type Row =
  | ({ kind: "owner" } & Person)
  | ({ kind: "admin" } & Person)
  | ({ kind: "collaborator"; key: string } & Collaborator);

const ROLE_LABELS: Record<CollaboratorRole, string> = {
  "full-access": "Full access",
  "content-editor": "Content editor",
  "view-only": "View only",
};

const ROLE_HINTS: Record<CollaboratorRole, string> = {
  "full-access": "Everything, including members, billing and publishing.",
  "content-editor": "Edit the website and content. No members or billing.",
  "view-only": "See the project. No changes.",
};

type Pending =
  | { type: "invite"; emails: string[]; role: CollaboratorRole }
  | { type: "role"; member: Collaborator; role: CollaboratorRole }
  | { type: "resend"; member: Collaborator }
  | { type: "remove"; member: Collaborator };

const parseEmails = (raw: string) =>
  Array.from(
    new Set(
      raw
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    )
  );

const looksLikeEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/** Everyone with access to the project: owner, agency admins, collaborators. */
export function MembersPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const me = useCurrentUser().data?.user ?? null;

  const membersKey = trpc.cms.collaborators.members.queryKey({ projectId });
  const members = useQuery(trpc.cms.collaborators.members.queryOptions({ projectId }));
  const refresh = () => void queryClient.invalidateQueries({ queryKey: membersKey });

  const [pending, setPending] = useState<Pending | null>(null);
  const [emailsRaw, setEmailsRaw] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("content-editor");

  const add = useMutation(
    trpc.cms.collaborators.add.mutationOptions({
      onSuccess: (result) => {
        toast.success(result.message);
        result.errors.forEach((e) => toast.error(e));
        setEmailsRaw("");
        refresh();
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't send the invite.")),
    })
  );
  const changeRole = useMutation(
    trpc.cms.collaborators.changeRole.mutationOptions({
      onSuccess: (result) => {
        toast.success(result.message);
        refresh();
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't change the role.")),
    })
  );
  const resend = useMutation(
    trpc.cms.collaborators.resend.mutationOptions({
      onSuccess: (result) => {
        toast.success(result.message);
        refresh();
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't resend the invite.")),
    })
  );
  const remove = useMutation(
    trpc.cms.collaborators.remove.mutationOptions({
      onSuccess: () => {
        toast.success("Access removed.");
        refresh();
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't remove the member.")),
    })
  );
  const busy = add.isPending || changeRole.isPending || resend.isPending || remove.isPending;

  const header = (
    <PageHeader
      title="Members"
      count={
        members.data
          ? members.data.owners.length + members.data.admins.length + members.data.collaborators.length
          : undefined
      }
      description="Everyone who can open this project, and what they're allowed to do."
    />
  );

  if (members.isPending) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Skeleton className="h-[140px] rounded-card" />
        <Skeleton className="h-[280px] rounded-card" />
      </div>
    );
  }

  if (members.isError) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Card>
          <EmptyState
            icon={<Users className="size-5" />}
            title="You can't manage members"
            text={handleCmsError(
              members.error,
              "Only the owner and people with full access can see members."
            )}
          />
        </Card>
      </div>
    );
  }

  const { canManageFullAccess } = members.data;
  const roles = assignableRoles(canManageFullAccess);
  const emails = parseEmails(emailsRaw);
  const invalid = emails.filter((e) => !looksLikeEmail(e));
  const inviteError =
    invalid.length > 0
      ? `Not an email: ${invalid.join(", ")}`
      : emails.length > INVITE_BATCH_MAX
        ? `Up to ${INVITE_BATCH_MAX} emails at a time.`
        : null;

  const rows: Row[] = [
    ...members.data.owners.map((u) => ({ kind: "owner" as const, key: `o-${u.id}`, userId: u.id, ...u })),
    ...members.data.admins.map((u) => ({ kind: "admin" as const, key: `a-${u.id}`, userId: u.id, ...u })),
    ...members.data.collaborators.map((c) => ({ kind: "collaborator" as const, key: `c-${c.id}`, ...c })),
  ];

  const columns: Column<Row>[] = [
    {
      key: "member",
      header: "Member",
      width: "minmax(240px, 3fr)",
      cell: (r) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-8 shrink-0">
            <AvatarImage src={r.image ?? `https://unavatar.io/${r.email}?fallback=false`} />
            <AvatarFallback className="text-[11px]">
              {getInitialsFromName(r.name || r.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-ink">
              {r.name || r.email}
              {me && r.userId === me.id && <span className="font-normal text-dim"> (you)</span>}
            </span>
            {r.name && <span className="truncate text-[13px] text-dim">{r.email}</span>}
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      width: "180px",
      cell: (r) => {
        if (r.kind === "owner") return <Badge tone="coral">Owner</Badge>;
        if (r.kind === "admin") return <Badge tone="neutral">Agency</Badge>;
        if (!canManageMember(r.role, canManageFullAccess)) return ROLE_LABELS[r.role];
        return (
          <Select
            aria-label={`Role for ${r.email}`}
            value={r.role}
            disabled={busy}
            onChange={(e) => {
              const next = e.target.value as CollaboratorRole;
              if (next !== r.role) setPending({ type: "role", member: r, role: next });
            }}
            className="h-8 text-[13px]"
          >
            {roles.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABELS[value]}
              </option>
            ))}
          </Select>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      width: "170px",
      cell: (r) => {
        if (r.kind !== "collaborator" || r.status === "active")
          return <Badge tone="success" dot>Active</Badge>;
        if (r.status === "pending")
          return (
            <span className="flex flex-col gap-0.5">
              <Badge tone="info" dot>Invited</Badge>
              {r.expiresAt && (
                <span className="text-[12px] text-dim">
                  Link expires in {formatDistanceToNowStrict(new Date(r.expiresAt))}
                </span>
              )}
            </span>
          );
        return <Badge tone="warning" dot>Invite expired</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      width: "190px",
      align: "end",
      cell: (r) =>
        r.kind === "collaborator" && canManageMember(r.role, canManageFullAccess) ? (
          <div className="flex items-center justify-end gap-1">
            {r.status !== "active" && (
              <Button
                size="sm"
                variant="ghost"
                icon={<Mail className="size-3.5" />}
                disabled={busy}
                onClick={() => setPending({ type: "resend", member: r })}
              >
                Resend
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              icon={<Trash2 className="size-3.5" />}
              disabled={busy}
              onClick={() => setPending({ type: "remove", member: r })}
            >
              Remove
            </Button>
          </div>
        ) : (
          <span className="text-[13px] text-faint">—</span>
        ),
    },
  ];

  const confirm = (() => {
    if (!pending) return null;
    switch (pending.type) {
      case "invite":
        return {
          title: pending.emails.length === 1 ? `Invite ${pending.emails[0]}?` : `Invite ${pending.emails.length} people?`,
          description: (
            <>
              {pending.emails.length > 1 && <>{pending.emails.join(", ")}. </>}
              They get an email with a sign-in link and {ROLE_LABELS[pending.role].toLowerCase()} access:{" "}
              {ROLE_HINTS[pending.role].toLowerCase()} The link only works for the invited email.
            </>
          ),
          confirmLabel: "Send invite",
          run: () => add.mutate({ projectId, emails: pending.emails, role: pending.role }),
        };
      case "role":
        return {
          title: `Change ${pending.member.email} to ${ROLE_LABELS[pending.role].toLowerCase()}?`,
          description: ROLE_HINTS[pending.role],
          confirmLabel: "Change role",
          run: () =>
            changeRole.mutate({ projectId, collaboratorId: pending.member.id, role: pending.role }),
        };
      case "resend":
        return {
          title: `Resend the invite to ${pending.member.email}?`,
          description: "They get a new sign-in link. Any earlier link stops working.",
          confirmLabel: "Resend invite",
          run: () => resend.mutate({ projectId, collaboratorId: pending.member.id }),
        };
      case "remove":
        return {
          title: `Remove ${pending.member.email}?`,
          description:
            pending.member.status === "active"
              ? "They lose access to this project right away. You can invite them again later."
              : "Their invite link stops working. You can invite them again later.",
          confirmLabel: "Remove",
          danger: true,
          run: () => remove.mutate({ projectId, collaboratorId: pending.member.id }),
        };
    }
  })();

  return (
    <div className="flex flex-col gap-6">
      {header}
      <Card>
        <CardHeader title="Invite people" divided />
        <form
          className="flex flex-col gap-3 px-6 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (emails.length === 0 || inviteError) return;
            setPending({ type: "invite", emails, role });
          }}
        >
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Emails" className="min-w-[240px] flex-[2]">
              <Input
                value={emailsRaw}
                onChange={(e) => setEmailsRaw(e.target.value)}
                placeholder="name@company.com, another@company.com"
                autoComplete="off"
              />
            </Field>
            <Field label="Role" className="min-w-[180px] flex-1">
              <Select value={role} onChange={(e) => setRole(e.target.value as CollaboratorRole)}>
                {roles.map((value) => (
                  <option key={value} value={value}>
                    {ROLE_LABELS[value]}
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              type="submit"
              variant="primary"
              icon={<UserPlus className="size-4" />}
              disabled={emails.length === 0 || !!inviteError || add.isPending}
            >
              {add.isPending ? "Sending…" : "Invite"}
            </Button>
          </div>
          <p className={inviteError ? "text-[13px] text-danger" : "text-[13px] text-dim"}>
            {inviteError ?? ROLE_HINTS[role]}
          </p>
        </form>
      </Card>

      <Card>
        <CardHeader title="People with access" divided />
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.key} minWidth={720} />
      </Card>

      {confirm && (
        <ConfirmDialog
          open={!!pending}
          onOpenChange={(open) => !open && setPending(null)}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          danger={"danger" in confirm && confirm.danger}
          onConfirm={confirm.run}
        />
      )}
    </div>
  );
}
