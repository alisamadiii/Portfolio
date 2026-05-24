"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  CreditCard,
  DollarSign,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe,
  Layers,
  Loader2,
  Mail,
  Activity,
  Bell,
  Settings,
  TrendingUp,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
} from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn, formatPrice } from "@workspace/ui/lib/utils";

import { CardAgency } from "@workspace/ui/agency/card-agency";

import { useTRPC } from "@workspace/trpc/client";

import { ClientScopes } from "@/components/clients/client-scopes";
import { ClientMediaGallery } from "@/components/clients/client-media-gallery";

// ─── Sidebar Nav ───────────────────────────────────────────────

const navItems = [
  { key: "overview", label: "Overview", icon: TrendingUp },
  { key: "project", label: "Project", icon: Settings },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "activity", label: "Activity", icon: Activity },
  { key: "scopes", label: "Scopes", icon: Layers },
  { key: "media", label: "Media", icon: FolderOpen },
] as const;

type NavKey = (typeof navItems)[number]["key"];

// ─── Stat Card ─────────────────────────────────────────────────

const StatCard = ({
  label,
  value,
  icon: Icon,
  iconColor,
  subtitle,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  iconColor: string;
  subtitle?: string;
}) => (
  <CardAgency.Card className="p-5">
    <div className="flex items-center justify-between">
      <p className="text-muted-foreground text-sm font-medium">{label}</p>
      <div className={cn("rounded-lg p-2", iconColor)}>
        <Icon className="size-4" />
      </div>
    </div>
    <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
      {value}
    </p>
    {subtitle && (
      <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p>
    )}
  </CardAgency.Card>
);

// ─── Status Helpers ────────────────────────────────────────────

const subStatusStyle: Record<string, string> = {
  active: "border-l-emerald-500 bg-emerald-500/5",
  trialing: "border-l-blue-500 bg-blue-500/5",
  canceled: "border-l-zinc-400 bg-zinc-400/5",
  incomplete: "border-l-amber-500 bg-amber-500/5",
  past_due: "border-l-red-500 bg-red-500/5",
};

const subBadgeVariant = (status: string) => {
  if (status === "active" || status === "trialing") return "default" as const;
  if (status === "past_due" || status === "incomplete")
    return "destructive" as const;
  return "secondary" as const;
};

const invoiceBadge = (status: string) => {
  if (status === "paid")
    return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (status === "open" || status === "draft")
    return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  return "bg-red-500/10 text-red-600 border-red-500/20";
};

const notifPriorityColor: Record<string, string> = {
  URGENT: "bg-red-500/10 text-red-600 border-red-500/20",
  HIGH: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  MEDIUM: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  LOW: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
};

const notifStatusIcon: Record<string, React.ElementType> = {
  PENDING: Clock,
  SEEN: Eye,
  SEEN_BY_ADMIN: Eye,
  RESOLVED: CheckCircle2,
  REJECTED: AlertCircle,
  REPLIED: Send,
};

const activityTypeColor: Record<string, { bg: string; text: string }> = {
  email: { bg: "bg-blue-500/10", text: "text-blue-500" },
  data_change: { bg: "bg-amber-500/10", text: "text-amber-500" },
  contact: { bg: "bg-violet-500/10", text: "text-violet-500" },
};

const activityTypeIcon: Record<string, React.ElementType> = {
  email: Mail,
  data_change: Settings,
  contact: Globe,
};

// ─── Overview Section ──────────────────────────────────────────

const OverviewSection = ({
  client,
  user,
}: {
  client: { isStripe: boolean };
  user: { id: string; email: string };
}) => {
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(
    new Set()
  );
  const trpc = useTRPC();

  const { data: subs, isLoading: subsLoading } = useQuery(
    trpc.payments.adminGetStripeSubscriptions.queryOptions(
      { email: user.email },
      { enabled: !!user.email, staleTime: 5 * 60 * 1000 }
    )
  );

  const { data: invoices, isLoading: invoicesLoading } = useQuery(
    trpc.payments.adminGetStripeInvoices.queryOptions(
      { email: user.email },
      { enabled: !!user.email, staleTime: 5 * 60 * 1000 }
    )
  );

  const stats = useMemo(() => {
    const paidInvoices = invoices?.filter((i) => i.status === "paid") ?? [];
    const totalPaid = paidInvoices.reduce((sum, i) => sum + i.amountPaid, 0);
    const activeSubs =
      subs?.filter(
        (s) => s.status === "active" || s.status === "trialing"
      ) ?? [];
    const monthlyRevenue = activeSubs.reduce((sum, s) => {
      if (s.interval === "year") return sum + s.amount / 12;
      return sum + s.amount;
    }, 0);

    return {
      totalPaid,
      activeSubCount: activeSubs.length,
      monthlyRevenue,
      invoiceCount: invoices?.length ?? 0,
    };
  }, [subs, invoices]);

  const loading = subsLoading || invoicesLoading;

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Paid"
          value={loading ? "--" : `$${formatPrice(stats.totalPaid)}`}
          icon={DollarSign}
          iconColor="bg-emerald-500/10 text-emerald-500"
          subtitle={
            stats.invoiceCount > 0
              ? `From ${stats.invoiceCount} invoice${stats.invoiceCount !== 1 ? "s" : ""}`
              : undefined
          }
        />
        <StatCard
          label="Active Subs"
          value={loading ? "--" : String(stats.activeSubCount)}
          icon={CreditCard}
          iconColor="bg-blue-500/10 text-blue-500"
          subtitle={
            subs && subs.length > stats.activeSubCount
              ? `${subs.length} total`
              : undefined
          }
        />
        <StatCard
          label="Monthly Revenue"
          value={loading ? "--" : `$${formatPrice(stats.monthlyRevenue)}/mo`}
          icon={TrendingUp}
          iconColor="bg-violet-500/10 text-violet-500"
        />
        <StatCard
          label="Invoices"
          value={loading ? "--" : String(stats.invoiceCount)}
          icon={FileText}
          iconColor="bg-amber-500/10 text-amber-500"
          subtitle={
            invoices?.some((i) => i.status !== "paid")
              ? `${invoices.filter((i) => i.status !== "paid").length} unpaid`
              : undefined
          }
        />
      </div>

      {/* Subscriptions */}
      {user.email && (
        <CardAgency.Card>
          <CardAgency.Header title="Subscriptions">
            {subs && <Badge variant="secondary">{subs.length}</Badge>}
          </CardAgency.Header>
          {subsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : !subs || subs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No subscriptions found.
            </p>
          ) : (
            <div className="space-y-3">
              {subs.map((sub) => (
                <div
                  key={sub.id}
                  className={cn(
                    "flex items-center justify-between rounded-xl border-l-4 p-4",
                    subStatusStyle[sub.status] ?? "border-l-zinc-300"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {sub.productName ?? (
                        <span className="font-mono text-xs opacity-60">
                          {sub.id.slice(0, 20)}
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-sm">
                      <span className="font-semibold tabular-nums">
                        ${formatPrice(sub.amount)}
                      </span>{" "}
                      / {sub.interval ?? "one-time"}{" "}
                      {sub.currentPeriodEnd && (
                        <span className="ml-2">
                          ends{" "}
                          {format(
                            new Date(sub.currentPeriodEnd * 1000),
                            "MMM d, yyyy"
                          )}
                        </span>
                      )}
                    </p>
                  </div>
                  <Badge
                    variant={subBadgeVariant(sub.status)}
                    className="ml-3 text-[10px] capitalize"
                  >
                    {sub.cancelAtPeriodEnd && sub.status === "active"
                      ? "canceling"
                      : sub.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardAgency.Card>
      )}

      {/* Invoices / Transactions */}
      {user.email && (
        <CardAgency.Card>
          <CardAgency.Header title="Transactions">
            {invoices && <Badge variant="secondary">{invoices.length}</Badge>}
          </CardAgency.Header>
          {invoicesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : !invoices || invoices.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No transactions found.
            </p>
          ) : (
            <div className="rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="px-4 py-3 font-medium">Invoice</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">PDF</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const isExpanded = expandedInvoices.has(inv.id);
                    return (
                      <Fragment key={inv.id}>
                        <tr className="border-b last:border-b-0 transition-colors hover:bg-muted/50">
                          <td className="px-4 py-3 font-mono text-xs">
                            {inv.number ?? inv.id.slice(0, 16)}
                          </td>
                          <td className="px-4 py-3 font-bold tabular-nums">
                            ${formatPrice(inv.amountPaid)}{" "}
                            <span className="text-muted-foreground text-xs font-normal uppercase">
                              {inv.currency}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] capitalize",
                                invoiceBadge(inv.status ?? "")
                              )}
                            >
                              {inv.status}
                            </Badge>
                          </td>
                          <td className="text-muted-foreground px-4 py-3 text-xs">
                            {format(new Date(inv.created * 1000), "MMM d, yyyy")}
                          </td>
                          <td className="px-4 py-3">
                            {inv.invoicePdf && (
                              <a
                                href={inv.invoicePdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <ExternalLink className="size-3.5" />
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() =>
                                setExpandedInvoices((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(inv.id)) next.delete(inv.id);
                                  else next.add(inv.id);
                                  return next;
                                })
                              }
                              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="size-3.5" />
                              ) : (
                                <ChevronRight className="size-3.5" />
                              )}
                              Items
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-muted/30">
                            <td colSpan={6} className="px-4 py-3">
                              <p className="text-muted-foreground mb-2 text-[10px] font-medium uppercase">
                                Line Items
                              </p>
                              {inv.lineItems.length === 0 ? (
                                <p className="text-muted-foreground text-xs">
                                  No line items
                                </p>
                              ) : (
                                <div className="space-y-1.5">
                                  {inv.lineItems.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between rounded-lg border bg-background px-3 py-2"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm">
                                          {item.description ?? "—"}
                                        </p>
                                        {item.quantity && item.quantity > 1 && (
                                          <p className="text-muted-foreground text-xs">
                                            Qty: {item.quantity}
                                          </p>
                                        )}
                                      </div>
                                      <span className="ml-4 shrink-0 text-sm font-semibold tabular-nums">
                                        ${formatPrice(item.amount)}{" "}
                                        <span className="text-muted-foreground text-xs font-normal uppercase">
                                          {item.currency}
                                        </span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardAgency.Card>
      )}

      {!user.email && (
        <CardAgency.Card className="py-12 text-center">
          <CreditCard className="text-muted-foreground mx-auto mb-3 size-8 opacity-40" />
          <p className="text-muted-foreground text-sm">
            No email found for this user. Email is required to look up billing
            data.
          </p>
        </CardAgency.Card>
      )}
    </div>
  );
};

// ─── Project Section ───────────────────────────────────────────

const projectFields = [
  { key: "domain", label: "Domain", placeholder: "example.com", mono: false, textarea: false },
  { key: "projectRepo", label: "Project Repository", placeholder: "https://github.com/...", mono: true, textarea: false },
  { key: "clickupListId", label: "ClickUp List ID", placeholder: "List ID", mono: true, textarea: false },
  { key: "figmaUrl", label: "Figma URL", placeholder: "https://figma.com/...", mono: true, textarea: false },
  { key: "techStack", label: "Tech Stack", placeholder: "Next.js, Tailwind, etc.", mono: false, textarea: false },
  { key: "launchDate", label: "Launch Date", placeholder: "2025-06-01", mono: false, textarea: false },
  { key: "timezone", label: "Timezone", placeholder: "America/Los_Angeles", mono: false, textarea: false },
  { key: "notes", label: "Notes", placeholder: "Internal notes...", mono: false, textarea: true },
] as const;

const ProjectSection = ({
  client,
  onUpdate,
  isPending,
}: {
  client: Record<string, unknown> & { id: string; status: string; isStripe: boolean };
  onUpdate: (data: Record<string, unknown>) => void;
  isPending: boolean;
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const openDialog = () => {
    const initial: Record<string, string> = {};
    for (const f of projectFields) {
      initial[f.key] = (client[f.key] as string) ?? "";
    }
    setForm(initial);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const updates: Record<string, string | null> = { id: client.id };
    for (const f of projectFields) {
      updates[f.key] = form[f.key] || null;
    }
    onUpdate(updates);
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <CardAgency.Card>
        <CardAgency.Header title="Project Details">
          <Button size="sm" onClick={openDialog}>
            Edit Details
          </Button>
        </CardAgency.Header>
        <div className="grid gap-5 sm:grid-cols-2">
          {projectFields.map((f) => {
            const val = client[f.key] as string | null;
            return (
              <div key={f.key}>
                <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  {f.label}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-sm",
                    f.mono && "font-mono",
                    !val && "text-muted-foreground"
                  )}
                >
                  {val || "Not set"}
                </p>
              </div>
            );
          })}
        </div>
      </CardAgency.Card>

      <CardAgency.Card>
        <CardAgency.Header title="Status" />
        <div className="flex items-center gap-3">
          <Badge
            variant={
              client.status === "active"
                ? "default"
                : client.status === "paused"
                  ? "secondary"
                  : "destructive"
            }
            className="text-xs capitalize"
          >
            {client.status}
          </Badge>
          <div className="flex gap-2">
            {(["active", "paused", "completed"] as const).map((s) => (
              <Button
                key={s}
                variant={client.status === s ? "default" : "outline"}
                size="sm"
                className="capitalize"
                disabled={client.status === s || isPending}
                onClick={() => onUpdate({ id: client.id, status: s })}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
      </CardAgency.Card>

      <CardAgency.Card>
        <CardAgency.Header title="Stripe Billing" />
        <div className="flex items-center gap-3">
          <Button
            variant={client.isStripe ? "default" : "outline"}
            size="sm"
            disabled={isPending}
            onClick={() =>
              onUpdate({ id: client.id, isStripe: !client.isStripe })
            }
          >
            {client.isStripe ? "Enabled" : "Disabled"}
          </Button>
          <span className="text-muted-foreground text-xs">
            {client.isStripe
              ? "Client can view Stripe billing in their portal"
              : "Agency billing page hidden from client"}
          </span>
        </div>
      </CardAgency.Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Project Details</DialogTitle>
            <DialogDescription>
              Update all project fields for this client.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            {projectFields.map((f) => (
              <div
                key={f.key}
                className={f.key === "notes" ? "sm:col-span-2" : ""}
              >
                <Label className="text-xs font-medium">{f.label}</Label>
                {f.textarea ? (
                  <Textarea
                    value={form[f.key] ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                    placeholder={f.placeholder}
                    className={cn("mt-1", f.mono && "font-mono")}
                    rows={3}
                  />
                ) : (
                  <Input
                    value={form[f.key] ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                    placeholder={f.placeholder}
                    className={cn("mt-1", f.mono && "font-mono")}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Notifications Section ─────────────────────────────────────

const NotificationsSection = ({
  userEmail,
}: {
  userEmail: string;
}) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [sendOpen, setSendOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const { data: notifications, isLoading } = useQuery(
    trpc.notification.listByEmail.queryOptions({ email: userEmail })
  );

  const updateStatus = useMutation(
    trpc.notification.updateStatus.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.notification.listByEmail.queryKey({ email: userEmail }),
        });
      },
    })
  );

  const sendMessage = useMutation(
    trpc.notification.sendToUser.mutationOptions({
      onSuccess: () => {
        setSendOpen(false);
        setSubject("");
        setMessage("");
      },
    })
  );

  return (
    <div className="space-y-6">
      <CardAgency.Card>
        <CardAgency.Header title="Notifications">
          <div className="flex items-center gap-2">
            {notifications && (
              <Badge variant="secondary">{notifications.length}</Badge>
            )}
            <Dialog open={sendOpen} onOpenChange={setSendOpen}>
              <DialogTrigger render={<Button size="sm" />}>
                <Send className="mr-1.5 size-3.5" />
                Send Message
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Message</DialogTitle>
                  <DialogDescription>
                    Send an email to {userEmail}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div>
                    <Label className="text-xs font-medium">Subject</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Message subject..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Message</Label>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write your message..."
                      className="mt-1"
                      rows={5}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setSendOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() =>
                      sendMessage.mutate({
                        to: userEmail,
                        subject,
                        message,
                      })
                    }
                    disabled={
                      !subject || !message || sendMessage.isPending
                    }
                  >
                    {sendMessage.isPending && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    Send
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardAgency.Header>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="text-muted-foreground mx-auto mb-2 size-8 opacity-40" />
            <p className="text-muted-foreground text-sm">
              No notifications from this client.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => {
              const StatusIcon =
                notifStatusIcon[notif.status] ?? Clock;
              return (
                <div
                  key={notif.id}
                  className="bg-background/50 rounded-xl border p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold">{notif.subject}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            notifPriorityColor[notif.priority]
                          )}
                        >
                          {notif.priority}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                        {notif.message}
                      </p>
                      <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <StatusIcon className="size-3" />
                          {notif.status.replace(/_/g, " ")}
                        </span>
                        <span>
                          {notif.projectType}
                        </span>
                        <span>
                          {formatDistanceToNow(new Date(notif.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {notif.status === "PENDING" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          disabled={updateStatus.isPending}
                          onClick={() =>
                            updateStatus.mutate({
                              notificationId: notif.id,
                              status: "SEEN_BY_ADMIN",
                            })
                          }
                        >
                          <Eye className="mr-1 size-3" />
                          Seen
                        </Button>
                      )}
                      {notif.status !== "RESOLVED" &&
                        notif.status !== "REJECTED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            disabled={updateStatus.isPending}
                            onClick={() =>
                              updateStatus.mutate({
                                notificationId: notif.id,
                                status: "RESOLVED",
                              })
                            }
                          >
                            <CheckCircle2 className="mr-1 size-3" />
                            Resolve
                          </Button>
                        )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardAgency.Card>
    </div>
  );
};

// ─── Activity Section ──────────────────────────────────────────

const ActivitySection = ({ userId }: { userId: string }) => {
  const trpc = useTRPC();
  const { data: logs, isLoading } = useQuery(
    trpc.logs.list.queryOptions({ userId, limit: 50 })
  );

  return (
    <CardAgency.Card>
      <CardAgency.Header title="Activity Log">
        {logs && <Badge variant="secondary">{logs.length}</Badge>}
      </CardAgency.Header>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : !logs || logs.length === 0 ? (
        <div className="py-8 text-center">
          <Activity className="text-muted-foreground mx-auto mb-2 size-8 opacity-40" />
          <p className="text-muted-foreground text-sm">
            No activity recorded for this client.
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {logs.map((log) => {
            const colors = activityTypeColor[log.type] ?? {
              bg: "bg-zinc-500/10",
              text: "text-zinc-500",
            };
            const TypeIcon = activityTypeIcon[log.type] ?? Activity;
            return (
              <div key={log.id} className="flex gap-3 py-3">
                <div
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                    colors.bg
                  )}
                >
                  <TypeIcon className={cn("size-3.5", colors.text)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{log.summary ?? "No summary"}</p>
                  <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                    <span className="capitalize">{log.type.replace("_", " ")}</span>
                    <span>
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
                <Badge
                  variant={
                    log.status === "success" ? "default" : "destructive"
                  }
                  className="mt-0.5 h-5 self-start text-[10px]"
                >
                  {log.status}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </CardAgency.Card>
  );
};

// ─── Page ──────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<NavKey>("overview");

  const { data, isLoading } = useQuery(
    trpc.clients.get.queryOptions(id, { enabled: !!id })
  );

  const updateClient = useMutation(
    trpc.clients.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.clients.get.queryKey(id),
        });
      },
    })
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1600px] p-4 md:p-8">
        <Skeleton className="mb-6 h-8 w-32" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
          <Skeleton className="h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { user, client } = data;

  return (
    <div className="mx-auto max-w-[1600px] p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-1.5"
          render={<Link href="/clients" />}
        >
          <ArrowLeft className="size-4" />
          Clients
        </Button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-14 rounded-xl">
              <AvatarImage src={user.image ?? ""} />
              <AvatarFallback className="text-lg">
                {user.name?.charAt(0) ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {user.name}
              </h1>
              <p className="text-muted-foreground text-sm">
                {user.email}
                {user.company && (
                  <span className="ml-2 opacity-60">/ {user.company}</span>
                )}
              </p>
            </div>
            <Badge
              variant={
                client.status === "active"
                  ? "default"
                  : client.status === "paused"
                    ? "secondary"
                    : "destructive"
              }
              className="ml-2 capitalize"
            >
              {client.status}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/users/${user.id}?tab=notifications`} />}
          >
            User Profile
          </Button>
        </div>
      </div>

      {/* Sidebar + Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-x-visible">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </button>
            );
          })}

          <Separator className="my-2 hidden lg:block" />

          {/* Quick info */}
          <div className="hidden space-y-3 px-3 lg:block">
            <div>
              <p className="text-muted-foreground text-[10px] font-medium uppercase">
                Phone
              </p>
              <p className="text-sm">{user.phone || "Not set"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] font-medium uppercase">
                Domain
              </p>
              <p className="text-sm">{client.domain || "Not set"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] font-medium uppercase">
                Joined
              </p>
              <p className="text-sm">
                {format(new Date(user.createdAt), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className="min-w-0">
          {activeSection === "overview" && (
            <OverviewSection client={client} user={user} />
          )}
          {activeSection === "project" && (
            <ProjectSection
              client={client as Record<string, unknown> & { id: string; status: string; isStripe: boolean }}
              onUpdate={(data) => updateClient.mutate(data as Parameters<typeof updateClient.mutate>[0])}
              isPending={updateClient.isPending}
            />
          )}
          {activeSection === "notifications" && (
            <NotificationsSection userEmail={user.email} />
          )}
          {activeSection === "activity" && (
            <ActivitySection userId={user.id} />
          )}
          {activeSection === "scopes" && (
            <ClientScopes userId={user.id} userEmail={user.email} />
          )}
          {activeSection === "media" && (
            <ClientMediaGallery userId={user.id} />
          )}
        </div>
      </div>
    </div>
  );
}
