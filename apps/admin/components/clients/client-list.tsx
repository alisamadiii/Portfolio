"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowRight, CreditCard, Layers, Receipt, Users } from "lucide-react";

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
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

const stripeGradient: Record<string, string> = {
  active:
    "border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent",
  canceling:
    "border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent",
  none: "border-l-4 border-l-red-500 bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent",
};

export const ClientList = () => {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(trpc.clients.list.queryOptions());

  const stripeCustomerIds = useMemo(
    () =>
      data
        ?.map((c) => c.stripeCustomerId)
        .filter((id): id is string => !!id) ?? [],
    [data]
  );

  const { data: subStatus } = useQuery(
    trpc.payments.adminBatchSubscriptionStatus.queryOptions(
      { stripeCustomerIds },
      {
        enabled: stripeCustomerIds.length > 0,
        staleTime: 5 * 60 * 1000,
      }
    )
  );

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-20">
        <Users className="size-8 opacity-40" />
        <p className="text-sm">No clients yet</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((client) => {
        const status = client.stripeCustomerId
          ? (subStatus?.[client.stripeCustomerId] ?? "none")
          : "none";

        return (
          <Card
            key={client.id}
            className={cn(
              "flex flex-col transition-shadow hover:shadow-md",
              stripeGradient[status]
            )}
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
            </CardHeader>

            <CardContent className="flex-1 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <Receipt className="text-muted-foreground size-3.5" />
                  <span className="text-sm font-medium tabular-nums">
                    {client.subscriptionCount}
                  </span>
                  <span className="text-muted-foreground text-xs">subs</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="text-muted-foreground size-3.5" />
                  <span className="text-sm font-medium tabular-nums">
                    {client.scopeCount}
                  </span>
                  <span className="text-muted-foreground text-xs">scopes</span>
                </div>
              </div>

              {client.stripeCustomerId ? (
                <div className="flex items-center gap-1.5">
                  <CreditCard className="text-muted-foreground size-3.5" />
                  <span className="text-muted-foreground truncate font-mono text-xs">
                    {client.stripeCustomerId}
                  </span>
                </div>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  No Stripe ID
                </Badge>
              )}
              <p className="text-muted-foreground text-xs">
                Added {format(new Date(client.createdAt), "MMM d, yyyy")}
              </p>
            </CardContent>

            <CardFooter className="border-t pt-4">
              <Button
                size="sm"
                render={<Link href={`/clients/${client.userId}`} />}
              >
                View Details
                <ArrowRight className="size-3" />
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};
