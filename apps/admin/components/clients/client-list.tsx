"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Loader2,
  Users,
} from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn, formatPrice } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { useSubscriptionDetails } from "@workspace/auth/hooks/use-payments";

type Client = RouterOutputs["users"]["getClients"][number];

const STATUS_COLORS: Record<Client["status"], string> = {
  active: "bg-emerald-500",
  trialing: "bg-blue-500",
  past_due: "bg-amber-500",
  canceled: "bg-red-500",
  unpaid: "bg-orange-500",
  incomplete: "bg-yellow-500",
  incomplete_expired: "bg-gray-400",
  paused: "bg-violet-500",
};

function StatusDot({
  status,
  isCanceling,
}: {
  status: Client["status"];
  isCanceling?: boolean;
}) {
  const color =
    isCanceling && status === "active"
      ? "bg-amber-500"
      : (STATUS_COLORS[status] ?? "bg-gray-400");
  return (
    <span
      className={cn("inline-block size-2 shrink-0 rounded-full", color)}
    />
  );
}

function SubscriptionDetails({
  subscriptionId,
  client,
}: {
  subscriptionId: string;
  client: Client;
}) {
  const { data, isLoading, error } = useSubscriptionDetails(subscriptionId);

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <p className="text-muted-foreground">Auto-Renewal</p>
          <Badge
            variant={
              client.cancelAtPeriodEnd || client.canceledAt
                ? "destructive"
                : "default"
            }
            className="mt-0.5 text-[10px]"
          >
            {client.cancelAtPeriodEnd || client.canceledAt ? "Off" : "On"}
          </Badge>
        </div>
        <div>
          <p className="text-muted-foreground">Next Billing</p>
          <p className="font-medium">
            {client.periodEnd
              ? format(new Date(client.periodEnd), "MMM d, yyyy")
              : "—"}
          </p>
          {client.periodEnd && (
            <p className="text-muted-foreground text-[10px]">
              {formatDistanceToNow(new Date(client.periodEnd), {
                addSuffix: true,
              })}
            </p>
          )}
        </div>
        {client.canceledAt && (
          <div>
            <p className="text-muted-foreground">Canceled At</p>
            <p className="font-medium">
              {format(new Date(client.canceledAt), "MMM d, yyyy")}
            </p>
          </div>
        )}
        <div className="col-span-2">
          <p className="text-muted-foreground">Subscription ID</p>
          <p className="text-muted-foreground truncate font-mono text-[10px]">
            {subscriptionId}
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <Loader2 className="size-3 animate-spin" />
          Loading plan items...
        </div>
      )}

      {error && !data && (
        <p className="text-muted-foreground text-xs">
          Could not load plan details.
        </p>
      )}

      {data?.scheduledChange && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs dark:border-amber-800 dark:bg-amber-950">
          <p className="font-medium text-amber-800 dark:text-amber-200">
            Switching to{" "}
            {data.scheduledChange.newProductName ?? "new plan"} on{" "}
            {format(
              new Date(data.scheduledChange.effectiveDate * 1000),
              "MMM d, yyyy"
            )}
          </p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
            Plan Items
          </p>
          {data.items.map((item) => (
            <div
              key={item.id}
              className="bg-muted flex items-center justify-between rounded-lg px-3 py-2 text-xs"
            >
              <span className="font-medium">
                {item.productName ?? item.productId?.slice(0, 16)}
              </span>
              <span className="text-muted-foreground">
                ${(item.unitAmount / 100).toFixed(2)}/{item.interval ?? "once"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const ClientList = () => {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(trpc.users.getClients.queryOptions());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-52 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-20">
        <Users className="size-8 opacity-40" />
        <p className="text-sm">No agency clients found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((client) => {
        const isExpanded =
          !!client.stripeSubscriptionId && expanded.has(client.id);
        const isCanceling = !!(
          client.cancelAtPeriodEnd || client.canceledAt
        );

        return (
          <Card
            key={client.id}
            className="flex flex-col transition-shadow hover:shadow-md"
          >
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="size-10 rounded-lg">
                  <AvatarImage src={client.image ?? ""} />
                  <AvatarFallback>
                    {client.name?.charAt(0) ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <CardTitle className="truncate text-lg">
                    {client.name}
                  </CardTitle>
                  <p className="text-muted-foreground truncate text-xs">
                    {client.email}
                  </p>
                  {client.company && (
                    <p className="text-muted-foreground truncate text-xs">
                      {client.company}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusDot status={client.status} isCanceling={isCanceling} />
                <Badge
                  variant={
                    client.status === "active" || client.status === "trialing"
                      ? "default"
                      : "destructive"
                  }
                  className="shrink-0"
                >
                  {isCanceling && client.status === "active"
                    ? "canceling"
                    : client.status}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-3">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold tabular-nums">
                  ${formatPrice(client.totalAmount)}
                </span>
                {client.billingInterval && (
                  <span className="text-muted-foreground text-sm">
                    /{client.billingInterval}
                  </span>
                )}
              </div>

              {client.periodStart && (
                <p className="text-muted-foreground text-xs">
                  Since{" "}
                  {format(new Date(client.periodStart), "MMM d, yyyy")}
                </p>
              )}

              {isExpanded && client.stripeSubscriptionId && (
                <SubscriptionDetails
                  subscriptionId={client.stripeSubscriptionId}
                  client={client}
                />
              )}
            </CardContent>

            <CardFooter className="flex items-center justify-between gap-2 border-t pt-4">
              <Button size="sm" asChild>
                <Link href={`/clients/${client.userId}`}>
                  View Details
                  <ArrowRight className="size-3" />
                </Link>
              </Button>
              {client.stripeSubscriptionId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => toggle(client.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                  Plan Info
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};
