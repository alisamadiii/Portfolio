"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeftIcon,
  Check,
  Copy,
  Download,
  Mail,
  MoreHorizontal,
  Plus,
  Trash,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Textarea } from "@workspace/ui/components/textarea";

import { useTRPC } from "@workspace/trpc/client";
import { CLIENT_PAYMENT_LABELS, formatCents } from "@workspace/trpc/lib/partners-shared";
import { urls } from "@workspace/ui/lib/company";

import { Content } from "@/components/content-admin";
import { StatTile } from "@/components/stat-tile";
import { StatusBadge } from "@/components/status-badge";

import { PartnerStatusBadge, ReferralStatusBadge } from "../status";
import { CodeDialog } from "./code-dialog";
import {
  ClientPaidDialog,
  PartnerPaidDialog,
  type Referral,
  ReferralDialog,
} from "./referral-dialogs";

const day = (d: Date | string | null) => (d ? format(new Date(d), "MMM d, yyyy") : "—");

type Confirm =
  | { kind: "reject" }
  | { kind: "delete" }
  | { kind: "deleteReferral"; referral: Referral }
  | { kind: "unmarkClient"; referral: Referral }
  | { kind: "unmarkPartner"; referral: Referral };

export default function PartnerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const query = useQuery(trpc.partners.get.queryOptions({ id }));

  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [codeMode, setCodeMode] = useState<"approve" | "change" | null>(null);
  const [notifyReject, setNotifyReject] = useState(true);
  const [editing, setEditing] = useState<
    { mode: "add"; referral: null } | { mode: "link" | "edit"; referral: Referral } | null
  >(null);
  const [clientPaid, setClientPaid] = useState<Referral | null>(null);
  const [partnerPaid, setPartnerPaid] = useState<Referral | null>(null);
  const [admin, setAdmin] = useState<{ payoutMethod: string; notes: string } | null>(null);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.partners.get.queryKey({ id }) });
    void queryClient.invalidateQueries({ queryKey: trpc.partners.list.queryKey() });
  };
  const onError = (e: { message: string }) => {
    toast.error(e.message);
    refresh();
  };
  const ok = (message: string) => () => {
    toast.success(message);
    setConfirm(null);
    refresh();
  };

  const reject = useMutation(trpc.partners.reject.mutationOptions({ onSuccess: ok("Rejected."), onError }));
  const resend = useMutation(trpc.partners.resendCode.mutationOptions({ onSuccess: ok("Code emailed again."), onError }));
  const update = useMutation(
    trpc.partners.update.mutationOptions({
      onSuccess: () => {
        setAdmin(null);
        ok("Saved.")();
      },
      onError,
    })
  );
  const remove = useMutation(
    trpc.partners.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Partner deleted.");
        void queryClient.invalidateQueries({ queryKey: trpc.partners.list.queryKey() });
        router.push("/partners");
      },
      onError,
    })
  );
  const pdf = useMutation(
    trpc.partners.agreementUrl.mutationOptions({
      onSuccess: ({ url }) => window.open(url, "_blank", "noopener"),
      onError,
    })
  );
  const regenerate = useMutation(
    trpc.partners.regenerateAgreement.mutationOptions({ onSuccess: ok("Agreement PDF created."), onError })
  );
  const deleteReferral = useMutation(
    trpc.partners.deleteReferral.mutationOptions({ onSuccess: ok("Referral deleted."), onError })
  );
  const unmarkClient = useMutation(
    trpc.partners.unmarkClientPaid.mutationOptions({ onSuccess: ok("Payment removed."), onError })
  );
  const receipt = useMutation(
    trpc.partners.payoutReceiptUrl.mutationOptions({
      onSuccess: ({ url }) => window.open(url, "_blank", "noopener"),
      onError,
    })
  );
  const unmarkPartner = useMutation(
    trpc.partners.unmarkPartnerPaid.mutationOptions({ onSuccess: ok("Payout removed."), onError })
  );

  if (query.isPending) {
    return (
      <Content className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </Content>
    );
  }
  if (query.isError) {
    return (
      <Content>
        <p className="text-muted-foreground text-sm">{query.error.message}</p>
      </Content>
    );
  }

  const { partner: p, referrals, stats, signups } = query.data;
  const busy = reject.isPending || resend.isPending || remove.isPending;
  const copy = (text: string, label: string) =>
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copied.`),
      () => toast.error("Couldn't copy.")
    );
  const later = (fn: () => void) => setTimeout(fn, 100);

  return (
    <Content className="space-y-6">
      <div>
        <Link href="/partners" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
          <ArrowLeftIcon className="size-4" /> Partners
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight">{p.fullName}</h1>
              <PartnerStatusBadge status={p.status} />
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Applied {day(p.createdAt)}
              {p.approvedAt && p.status === "approved" ? ` · approved ${day(p.approvedAt)}` : ""}
              {p.rejectedAt && p.status === "rejected" ? ` · rejected ${day(p.rejectedAt)}` : ""}
            </p>
            {p.code && (
              <button
                type="button"
                onClick={() => copy(p.code!, "Code")}
                className="bg-muted mt-3 inline-flex items-center gap-2 rounded-md px-3 py-1.5 font-mono text-sm font-semibold tracking-wider"
              >
                {p.code}
                <Copy className="text-muted-foreground size-3.5" />
              </button>
            )}
            {p.code && p.status === "approved" && (
              <Button variant="ghost" size="sm" className="mt-3 ml-2" onClick={() => setCodeMode("change")}>
                Change code
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {p.status !== "approved" && (
              <Button disabled={busy} onClick={() => setCodeMode("approve")}>
                <Check /> Approve…
              </Button>
            )}
            {p.status === "approved" && (
              <Button variant="outline" disabled={busy} onClick={() => resend.mutate({ id })}>
                <Mail /> Resend code
              </Button>
            )}
            {p.status !== "rejected" && (
              <Button variant="outline" disabled={busy} onClick={() => setConfirm({ kind: "reject" })}>
                <X /> Reject
              </Button>
            )}
            <Button variant="destructive" disabled={busy} onClick={() => setConfirm({ kind: "delete" })}>
              <Trash /> Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile tone="violet" label="Referred" value={stats.referrals} />
        <StatTile tone="green" label="Paying" value={stats.paying} sub={`${stats.paidOut} paid out`} />
        <StatTile tone="orange" label="Owed" value={formatCents(stats.owedCents)} />
        <StatTile tone="green" label="Paid out" value={formatCents(stats.paidCents)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="bg-card rounded-2xl border p-5">
          <h2 className="mb-3 font-semibold">Contact</h2>
          <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
            <dt className="text-muted-foreground">Email</dt>
            <dd>
              <a className="hover:underline" href={`mailto:${p.email}`}>{p.email}</a>
            </dd>
            <dt className="text-muted-foreground">Phone</dt>
            <dd>{p.phone ? <a className="hover:underline" href={`tel:${p.phone}`}>{p.phone}</a> : "—"}</dd>
            <dt className="text-muted-foreground">Occupation</dt>
            <dd>{p.occupation ?? "—"}</dd>
            <dt className="text-muted-foreground">City</dt>
            <dd>{p.city ?? "—"}</dd>
          </dl>
        </section>

        <section className="bg-card rounded-2xl border p-5">
          <h2 className="mb-3 font-semibold">Signed agreement</h2>
          <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
            <dt className="text-muted-foreground">Signature</dt>
            <dd className="italic">{p.signature}</dd>
            <dt className="text-muted-foreground">Initials</dt>
            <dd>{p.initials}</dd>
            <dt className="text-muted-foreground">Signed</dt>
            <dd>{format(new Date(p.signedAt), "MMM d, yyyy h:mm a")}</dd>
            <dt className="text-muted-foreground">Version</dt>
            <dd>{p.agreementVersion}</dd>
            <dt className="text-muted-foreground">IP</dt>
            <dd>{p.signedIp ?? "—"}</dd>
          </dl>
          <div className="mt-4">
            {p.hasAgreement ? (
              <Button variant="outline" size="sm" disabled={pdf.isPending} onClick={() => pdf.mutate({ id })}>
                <Download /> Download PDF
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled={regenerate.isPending} onClick={() => regenerate.mutate({ id })}>
                Create missing PDF
              </Button>
            )}
          </div>
        </section>

        <section className="bg-card rounded-2xl border p-5">
          <h2 className="mb-3 font-semibold">Application</h2>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">How do you know local business owners?</p>
              <p className="whitespace-pre-wrap">{p.knowOwners ?? "Skipped"}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Why do you want to join?</p>
              <p className="whitespace-pre-wrap">{p.whyJoin ?? "Skipped"}</p>
            </div>
          </div>
        </section>

        <section className="bg-card rounded-2xl border p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Payout &amp; notes</h2>
            {!admin && (
              <Button variant="ghost" size="sm" onClick={() => setAdmin({ payoutMethod: p.payoutMethod ?? "", notes: p.notes ?? "" })}>
                Edit
              </Button>
            )}
          </div>
          {admin ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                update.mutate({ id, payoutMethod: admin.payoutMethod, notes: admin.notes });
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="payout">Payout method</Label>
                <Input
                  id="payout"
                  maxLength={300}
                  placeholder="Zelle (555) 123-4567"
                  value={admin.payoutMethod}
                  onChange={(e) => setAdmin({ ...admin, payoutMethod: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Private notes</Label>
                <Textarea id="notes" rows={4} maxLength={5000} value={admin.notes} onChange={(e) => setAdmin({ ...admin, notes: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={update.isPending}>Save</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setAdmin(null)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
              <dt className="text-muted-foreground">Payout method</dt>
              <dd>{p.payoutMethod || "—"}</dd>
              <dt className="text-muted-foreground">Notes</dt>
              <dd className="whitespace-pre-wrap">{p.notes || "—"}</dd>
            </dl>
          )}
        </section>
      </div>

      <section className="bg-card rounded-2xl border p-5">
        <h2 className="font-semibold">Hub accounts with this code</h2>
        <p className="text-muted-foreground mb-3 text-sm">
          People who signed up or signed in within 30 days of opening {p.code ? `the ${p.code} link` : "this partner's link"}.
          Add a referral when one of them becomes a client.
        </p>
        {signups.length === 0 ? (
          <p className="text-muted-foreground text-sm">None yet.</p>
        ) : (
          <ul className="divide-y text-sm">
            {signups.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`/users/${u.id}`} className="min-w-0 truncate hover:underline">
                  {u.name} <span className="text-muted-foreground">{u.email}</span>
                </Link>
                <span className="text-muted-foreground shrink-0 text-xs">Joined {day(u.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Referrals</h2>
          <Button size="sm" onClick={() => setEditing({ mode: "add", referral: null })}>
            <Plus /> Add referral
          </Button>
        </div>
        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Client paid</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Partner paid</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-20 text-center">
                    No referrals yet.
                  </TableCell>
                </TableRow>
              )}
              {referrals.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.projectId ? (
                      <>
                        <div className="flex items-center gap-2">
                          <a
                            href={`${urls.cms}/p/${r.projectId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium hover:underline"
                          >
                            {r.project?.name ?? r.businessName}
                          </a>
                          {r.project && (
                            <StatusBadge tone={r.project.isFree ? "gray" : "orange"}>{r.project.plan}</StatusBadge>
                          )}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {r.priceCents ? `${formatCents(r.priceCents)} website` : "No price set"}
                          {r.project ? "" : " · project deleted"}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-medium">Lead: {r.contactName || r.businessName}</div>
                        <div className="text-muted-foreground text-xs">
                          {[r.businessName !== r.contactName ? r.businessName : null, r.email, r.phone]
                            .filter(Boolean)
                            .join(" · ")}
                          {" · via form, no project yet"}
                        </div>
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    <ReferralStatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {r.clientPaidAt ? (
                      <>
                        {formatCents(r.clientPaidCents ?? 0)}
                        <div className="text-muted-foreground text-xs">
                          {day(r.clientPaidAt)}
                          {r.clientPaymentMethod ? ` · ${CLIENT_PAYMENT_LABELS[r.clientPaymentMethod]}` : ""}
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {r.commissionCents != null ? formatCents(r.commissionCents) : "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {r.partnerPaidAt ? (
                      <>
                        {day(r.partnerPaidAt)}
                        {r.payoutReference && <div className="text-muted-foreground text-xs">{r.payoutReference}</div>}
                        {r.payoutReceiptKey && (
                          <button
                            type="button"
                            className="text-xs underline underline-offset-2 hover:no-underline disabled:opacity-50"
                            disabled={receipt.isPending}
                            title={r.payoutReceiptName ?? undefined}
                            onClick={() => receipt.mutate({ referralId: r.id })}
                          >
                            View receipt
                          </button>
                        )}
                      </>
                    ) : r.clientPaidAt ? (
                      <span className="text-orange-600 dark:text-orange-400">Owed</span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Referral actions" />}>
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuGroup>
                          {!r.projectId && (
                            <DropdownMenuItem onClick={() => later(() => setEditing({ mode: "link", referral: r }))}>
                              Link project…
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => later(() => setEditing({ mode: "edit", referral: r }))}>
                            Edit
                          </DropdownMenuItem>
                          {!r.projectId ? null : !r.clientPaidAt ? (
                            <DropdownMenuItem onClick={() => later(() => setClientPaid(r))}>Client paid…</DropdownMenuItem>
                          ) : !r.partnerPaidAt ? (
                            <>
                              <DropdownMenuItem onClick={() => later(() => setPartnerPaid(r))}>Partner paid…</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => later(() => setConfirm({ kind: "unmarkClient", referral: r }))}>
                                Undo client payment
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem onClick={() => later(() => setConfirm({ kind: "unmarkPartner", referral: r }))}>
                              Undo partner payout
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => later(() => setConfirm({ kind: "deleteReferral", referral: r }))}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            {referrals.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground text-xs">
                    {stats.paying} paying of {stats.referrals}
                  </TableCell>
                  <TableCell colSpan={3} className="text-xs">
                    Owed <span className="font-semibold">{formatCents(stats.owedCents)}</span>
                    {" · "}Paid <span className="font-semibold">{formatCents(stats.paidCents)}</span>
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </section>

      {codeMode && (
        <CodeDialog
          key={codeMode}
          mode={codeMode}
          partnerId={id}
          partnerName={p.fullName}
          currentCode={p.code}
          onOpenChange={(open) => !open && setCodeMode(null)}
          onDone={refresh}
        />
      )}

      {editing && (
        <ReferralDialog
          key={`${editing.mode}-${editing.referral?.id ?? "new"}`}
          mode={editing.mode}
          partnerId={id}
          referral={editing.referral}
          onOpenChange={(open) => !open && setEditing(null)}
          onDone={refresh}
        />
      )}
      <ClientPaidDialog
        key={`cp-${clientPaid?.id ?? "none"}`}
        referral={clientPaid}
        onOpenChange={(open) => !open && setClientPaid(null)}
        onDone={refresh}
      />
      <PartnerPaidDialog
        key={`pp-${partnerPaid?.id ?? "none"}`}
        referral={partnerPaid}
        payoutMethod={p.payoutMethod}
        onOpenChange={(open) => !open && setPartnerPaid(null)}
        onDone={refresh}
      />

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent className="md:max-w-96">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "reject" && `Reject ${p.fullName}?`}
              {confirm?.kind === "delete" && `Delete ${p.fullName}?`}
              {confirm?.kind === "deleteReferral" && `Delete ${confirm.referral.businessName}?`}
              {confirm?.kind === "unmarkClient" && "Undo client payment?"}
              {confirm?.kind === "unmarkPartner" && "Undo partner payout?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "reject" &&
                (p.code ? "Their referral code stops working." : "They won't get a referral code.")}
              {confirm?.kind === "delete" &&
                `This permanently deletes the partner, all ${referrals.length} referrals and the signed agreement PDF.`}
              {confirm?.kind === "deleteReferral" && "This removes the referral and any payment records on it."}
              {confirm?.kind === "unmarkClient" && "The referral goes back to not paying and the commission is cleared."}
              {confirm?.kind === "unmarkPartner" && "The commission shows as owed again and the receipt is deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirm?.kind === "reject" && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={notifyReject} onCheckedChange={(v) => setNotifyReject(!!v)} />
              Email them a short, polite note
            </label>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant={confirm?.kind === "delete" || confirm?.kind === "deleteReferral" ? "destructive" : "default"}
              disabled={
                reject.isPending ||
                remove.isPending ||
                deleteReferral.isPending ||
                unmarkClient.isPending ||
                unmarkPartner.isPending
              }
              onClick={() => {
                if (!confirm) return;
                if (confirm.kind === "reject") reject.mutate({ id, notify: notifyReject });
                if (confirm.kind === "delete") remove.mutate({ id });
                if (confirm.kind === "deleteReferral") deleteReferral.mutate({ referralId: confirm.referral.id });
                if (confirm.kind === "unmarkClient") unmarkClient.mutate({ referralId: confirm.referral.id });
                if (confirm.kind === "unmarkPartner") unmarkPartner.mutate({ referralId: confirm.referral.id });
              }}
            >
              {confirm?.kind === "reject" ? "Reject" : confirm?.kind?.startsWith("unmark") ? "Undo" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Content>
  );
}
