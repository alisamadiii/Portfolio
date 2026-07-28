"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Eye, Loader2, Mail, MessageSquare, Send, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { CardAgency } from "@workspace/ui/agency/card-agency";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { agency, unwrap } from "@/lib/agency";
import { QueryError } from "@/components/users/api/query-error";

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

export function EmailUsage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["agency", "email-logs", id],
    queryFn: async () =>
      unwrap(await agency.admin.emailLogs.list({ userId: id, limit: 10 })),
    enabled: !!id,
  });
  const stats = data?.stats;
  const logs = data?.emails;
  const logsLoading = isLoading;

  // The presigned URL dies in ~60s, so fetch fresh on every click.
  const openHtml = useMutation({
    mutationFn: async (logId: string) =>
      unwrap(await agency.emails.getHtml(logId)),
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener"),
    onError: (error) => toast.error(error.message),
  });

  if (isError) {
    return (
      <QueryError
        title="Failed to load email usage"
        error={error}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Emails Sent"
          value={isLoading ? "--" : String(stats?.total ?? 0)}
          icon={Mail}
          iconColor="bg-emerald-500/10 text-emerald-500"
          subtitle={
            stats?.lastSentAt
              ? `Last sent ${format(new Date(stats.lastSentAt), "MMM d, yyyy")}`
              : undefined
          }
        />
        <StatCard
          label="This Month"
          value={isLoading ? "--" : String(stats?.thisMonth ?? 0)}
          icon={TrendingUp}
          iconColor="bg-blue-500/10 text-blue-500"
        />
        <StatCard
          label="API Sends"
          value={isLoading ? "--" : String(stats?.send ?? 0)}
          icon={Send}
          iconColor="bg-violet-500/10 text-violet-500"
        />
        <StatCard
          label="Contact Forms"
          value={isLoading ? "--" : String(stats?.contact ?? 0)}
          icon={MessageSquare}
          iconColor="bg-amber-500/10 text-amber-500"
        />
      </div>

      <CardAgency.Card>
        <CardAgency.Header title="Recent Emails">
          {logs && <Badge variant="secondary">{logs.length}</Badge>}
        </CardAgency.Header>
        {logsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : !logs || logs.length === 0 ? (
          <p className="text-muted-foreground text-sm">No emails sent yet.</p>
        ) : (
          <div className="rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs">
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">From</th>
                  <th className="px-4 py-3 font-medium">To</th>
                  <th className="px-4 py-3 font-medium">Kind</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-muted/50 border-b transition-colors last:border-b-0"
                  >
                    <td className="max-w-52 truncate px-4 py-3">
                      {log.subject}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-xs">
                      {log.fromAddress}
                    </td>
                    <td className="text-muted-foreground max-w-40 truncate px-4 py-3 text-xs">
                      {log.kind === "contact" && log.visitorEmail
                        ? `${log.visitorEmail} (visitor)`
                        : log.to.join(", ")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={log.kind === "send" ? "default" : "secondary"}
                        className="text-[10px] capitalize"
                      >
                        {log.kind}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-xs">
                      {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="View email"
                        disabled={openHtml.isPending}
                        onClick={() => openHtml.mutate(log.id)}
                      >
                        {openHtml.isPending &&
                        openHtml.variables === log.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardAgency.Card>
    </div>
  );
}
