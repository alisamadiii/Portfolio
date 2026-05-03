"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowRight, Users } from "lucide-react";

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
import { formatPrice } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

export const ClientList = () => {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(
    trpc.users.getClients.queryOptions()
  );

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
      {data.map((client) => (
        <Card
          key={client.userId}
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
            <Badge
              variant={client.status === "active" ? "default" : "destructive"}
              className="shrink-0"
            >
              {client.status}
            </Badge>
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
                Since {format(new Date(client.periodStart), "MMM d, yyyy")}
              </p>
            )}
          </CardContent>

          <CardFooter className="border-t pt-4">
            <Button size="sm" asChild>
              <Link href={`/clients/${client.userId}`}>
                View Details
                <ArrowRight className="size-3" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};
