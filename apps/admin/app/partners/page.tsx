"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { BadgeCheck, Banknote, Clock, Handshake, Wallet } from "lucide-react";

import { Input } from "@workspace/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";

import { useTRPC } from "@workspace/trpc/client";
import { formatCents } from "@workspace/trpc/lib/partners-shared";

import { Content } from "@/components/content-admin";
import { StatTile } from "@/components/stat-tile";

import { PartnerStatusBadge } from "./status";

const FILTERS = ["all", "pending", "approved", "rejected"] as const;
type Filter = (typeof FILTERS)[number];

// Admin: Partner Program applications and referral partners. Approve by
// hand, then track each partner's referrals and what they're owed.
export default function PartnersPage() {
  const trpc = useTRPC();
  const list = useQuery(trpc.partners.list.queryOptions());
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const summary = list.data?.summary;
  const needle = search.trim().toLowerCase();
  const rows = (list.data?.partners ?? []).filter(
    (p) =>
      (filter === "all" || p.status === filter) &&
      (!needle ||
        [p.fullName, p.email, p.city ?? "", p.occupation ?? "", p.code ?? ""].some((v) =>
          v.toLowerCase().includes(needle)
        ))
  );

  return (
    <Content>
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight">Partners</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Referral partners earn 40% of a referred client&apos;s first website
          payment. Approve applications, log referrals and mark payouts.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile
          icon={<Clock />}
          tone="amber"
          label="Pending"
          value={summary?.pending ?? 0}
          sub="applications"
          isLoading={list.isPending}
        />
        <StatTile
          icon={<Handshake />}
          tone="violet"
          label="Approved partners"
          value={summary?.approved ?? 0}
          isLoading={list.isPending}
        />
        <StatTile
          icon={<BadgeCheck />}
          tone="green"
          label="Paying clients"
          value={summary?.paying ?? 0}
          sub={summary ? `of ${summary.referrals} referred` : undefined}
          isLoading={list.isPending}
        />
        <StatTile
          icon={<Wallet />}
          tone="orange"
          label="Owed to partners"
          value={formatCents(summary?.owedCents ?? 0)}
          isLoading={list.isPending}
        />
        <StatTile
          icon={<Banknote />}
          tone="green"
          label="Paid out"
          value={formatCents(summary?.paidCents ?? 0)}
          sub={summary ? `${summary.paidOut} payouts` : undefined}
          isLoading={list.isPending}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            {FILTERS.map((f) => (
              <TabsTrigger key={f} value={f} className="capitalize">
                {f}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, city, code"
          className="w-full sm:w-72"
        />
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partner</TableHead>
              <TableHead>Occupation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="text-right">Referred</TableHead>
              <TableHead className="text-right">Paying</TableHead>
              <TableHead className="text-right">Owed</TableHead>
              <TableHead className="text-right">Paid out</TableHead>
              <TableHead>Applied</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.isPending && (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground h-20 text-center">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!list.isPending && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground h-20 text-center">
                  {list.data?.partners.length ? "No partners match." : "No applications yet."}
                </TableCell>
              </TableRow>
            )}
            {rows.map((p) => (
              <TableRow key={p.id} className="relative h-12">
                <TableCell>
                  <Link
                    href={`/partners/${p.id}`}
                    className="font-medium after:absolute after:inset-0 hover:underline"
                  >
                    {p.fullName}
                  </Link>
                  <div className="text-muted-foreground text-xs">{p.email}</div>
                </TableCell>
                <TableCell>
                  <div>{p.occupation ?? "—"}</div>
                  {p.city && <div className="text-muted-foreground text-xs">{p.city}</div>}
                </TableCell>
                <TableCell>
                  <PartnerStatusBadge status={p.status} />
                </TableCell>
                <TableCell className="font-mono text-xs">{p.code ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{p.stats.referrals}</TableCell>
                <TableCell className="text-right tabular-nums">{p.stats.paying}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.stats.owedCents ? formatCents(p.stats.owedCents) : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.stats.paidCents ? formatCents(p.stats.paidCents) : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                  {format(new Date(p.createdAt), "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Content>
  );
}
