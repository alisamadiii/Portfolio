"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Code2, DollarSign, Repeat, Users } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { useTRPC } from "@workspace/trpc/client";

import { Content } from "@/components/content-admin";
import { RevenueChart } from "@/components/revenue-chart";
import { StatTile } from "@/components/stat-tile";
import { StatusBadge } from "@/components/status-badge";

const formatUSD = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);

export default function OverviewPage() {
  const trpc = useTRPC();
  const router = useRouter();

  const { data: stats, isPending: statsPending } = useQuery(
    trpc.stats.overview.queryOptions()
  );
  const { data: revenueByMonth, isPending: revenuePending } = useQuery(
    trpc.stats.revenueByMonth.queryOptions()
  );
  const { data: recentOrders, isPending: ordersPending } = useQuery(
    trpc.stats.recentOrders.queryOptions({ limit: 8 })
  );
  const { data: recentUsers, isPending: usersPending } = useQuery(
    trpc.users.list.queryOptions({ page: 1, limit: 6, sortBy: "created" })
  );

  // Month-over-month revenue delta from the two most recent months
  const last = revenueByMonth?.at(-1)?.revenue ?? 0;
  const prev = revenueByMonth?.at(-2)?.revenue ?? 0;
  const revenueDelta =
    prev > 0 ? `${last >= prev ? "+" : ""}${Math.round(((last - prev) / prev) * 100)}%` : undefined;

  return (
    <Content>
      <h1 className="mb-5 text-xl font-semibold tracking-tight">Overview</h1>

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={<DollarSign />}
          tone="amber"
          label="Revenue"
          value={formatUSD(stats?.orders.paidRevenue ?? 0)}
          delta={revenueDelta}
          sub={`${stats?.orders.paidCount ?? 0} paid`}
          isLoading={statsPending}
        />
        <StatTile
          icon={<Users />}
          tone="violet"
          label="Users"
          value={stats?.users.total ?? 0}
          delta={
            stats?.users.last30d ? `+${stats.users.last30d} (30d)` : undefined
          }
          isLoading={statsPending}
        />
        <StatTile
          icon={<Repeat />}
          tone="green"
          label="Subscriptions"
          value={stats?.subscriptions.active ?? 0}
          sub="active"
          isLoading={statsPending}
        />
        <StatTile
          icon={<Code2 />}
          tone="orange"
          label="Code sources"
          value={stats?.sources.total ?? 0}
          sub={<Link href="/code" className="hover:text-foreground transition-colors">Manage</Link>}
          isLoading={statsPending}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RevenueChart
          data={revenueByMonth}
          isLoading={revenuePending}
          className="lg:col-span-2"
        />

        <section className="bg-card rounded-2xl border p-5">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent signups</h2>
            <Link
              href="/users"
              className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              View all
            </Link>
          </header>
          <div className="-mx-2">
            {usersPending ? (
              <ListSkeleton rows={6} />
            ) : !recentUsers?.length ? (
              <EmptyRow label="No users yet." />
            ) : (
              recentUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => router.push(`/users/${user.id}`)}
                  className="hover:bg-accent flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors"
                >
                  <Avatar className="size-7">
                    <AvatarImage src={user.image ?? ""} />
                    <AvatarFallback className="text-[9px]">
                      {(user.name ?? user.email).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {user.name ?? "—"}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {user.email}
                    </p>
                  </div>
                  <span className="text-num text-muted-foreground shrink-0 text-xs">
                    {formatDistanceToNow(new Date(user.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="bg-card rounded-2xl border p-5">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent orders</h2>
          <Link
            href="/products"
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            Products
          </Link>
        </header>
        <div>
          {ordersPending ? (
            <ListSkeleton rows={5} />
          ) : !recentOrders?.length ? (
            <EmptyRow label="No orders yet." />
          ) : (
            recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-3 border-b py-2.5 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {order.billingName || order.email}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {order.productName ?? "Unknown product"}
                  </p>
                </div>
                <StatusBadge
                  tone={order.status === "paid" ? "green" : "gray"}
                  dot
                  className="capitalize"
                >
                  {order.status.replace("_", " ")}
                </StatusBadge>
                <span className="text-num w-20 shrink-0 text-right text-sm font-medium">
                  {formatUSD(order.totalAmount)}
                </span>
                <span className="text-num text-muted-foreground w-16 shrink-0 text-right text-xs">
                  {order.createdAt
                    ? format(new Date(order.createdAt), "MMM d")
                    : "—"}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </Content>
  );
}

const ListSkeleton = ({ rows }: { rows: number }) => (
  <div className="flex flex-col gap-2 p-2">
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-8 w-full" />
    ))}
  </div>
);

const EmptyRow = ({ label }: { label: string }) => (
  <p className="text-muted-foreground px-4 py-8 text-center text-sm">
    {label}
  </p>
);
