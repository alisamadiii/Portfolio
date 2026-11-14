"use client";

import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow, parseISO } from "date-fns";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { Badge } from "@/components/ds/ui/badge";
import { Button } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { useRouteProjectId } from "@/hooks/use-repo";
import { handleCmsError } from "@/lib/trpc-errors";

// Read-only Wix records: contacts, store orders, upcoming bookings.

type Contact = RouterOutputs["wix"]["contacts"]["contacts"][number];
type Order = RouterOutputs["wix"]["orders"][number];
type Booking = RouterOutputs["wix"]["bookings"][number];

const ago = (iso: string | null) =>
  iso ? formatDistanceToNow(parseISO(iso), { addSuffix: true }) : "—";

const label = (s: string | null) =>
  s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ") : "—";

const Empty = ({ text }: { text: string }) => (
  <p className="px-6 py-8 text-center text-[13px] text-dim">{text}</p>
);

const PAGE = 50;

export function WixContacts() {
  const trpc = useTRPC();
  const projectId = useRouteProjectId();
  const [pages, setPages] = useState(1);
  const results = useQueries({
    queries: Array.from({ length: pages }, (_, i) =>
      trpc.wix.contacts.queryOptions({ projectId, offset: i * PAGE }, { retry: false })
    ),
  });
  const first = results[0]!;
  const rows = results.flatMap((r) => r.data?.contacts ?? []);
  const total = first.data?.total ?? null;
  const loading = results.some((r) => r.isFetching);

  const columns: Column<Contact>[] = [
    {
      key: "name",
      header: "Name",
      width: "minmax(160px, 2fr)",
      cell: (c) => <span className="truncate font-medium text-ink">{c.name ?? "—"}</span>,
    },
    { key: "email", header: "Email", width: "minmax(180px, 2fr)", cell: (c) => <span className="truncate">{c.email ?? "—"}</span> },
    { key: "phone", header: "Phone", width: "150px", cell: (c) => c.phone ?? "—" },
    { key: "created", header: "Added", width: "140px", align: "end", cell: (c) => ago(c.createdAt) },
  ];

  return (
    <Card>
      <CardHeader title={total != null ? `Contacts (${total})` : "Contacts"} divided />
      {first.isPending ? (
        <Skeleton className="m-6 h-[200px]" />
      ) : first.isError ? (
        <p className="px-6 py-6 text-[13px] text-dim">{handleCmsError(first.error, "Couldn't load contacts.")}</p>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(c) => c.id} minWidth={620} empty={<Empty text="No contacts yet." />} />
      )}
      {total != null && rows.length < total && (
        <div className="flex justify-center border-t border-divider px-6 py-3">
          <Button size="sm" disabled={loading} onClick={() => setPages((n) => n + 1)}>
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </Card>
  );
}

export function WixOrders() {
  const trpc = useTRPC();
  const projectId = useRouteProjectId();
  const orders = useQuery(trpc.wix.orders.queryOptions({ projectId }, { retry: false }));
  const columns: Column<Order>[] = [
    {
      key: "number",
      header: "Order",
      width: "100px",
      cell: (o) => <span className="font-medium text-ink">{o.number ? `#${o.number}` : "—"}</span>,
    },
    { key: "customer", header: "Customer", width: "minmax(160px, 2fr)", cell: (o) => <span className="truncate">{o.customer ?? "—"}</span> },
    { key: "total", header: "Total", width: "110px", cell: (o) => o.total ?? "—" },
    {
      key: "payment",
      header: "Payment",
      width: "130px",
      cell: (o) => (
        <Badge tone={o.paymentStatus === "PAID" ? "success" : "neutral"}>{label(o.paymentStatus)}</Badge>
      ),
    },
    { key: "fulfillment", header: "Fulfillment", width: "140px", cell: (o) => label(o.fulfillmentStatus) },
    { key: "date", header: "Placed", width: "130px", align: "end", cell: (o) => ago(o.createdAt) },
  ];
  return (
    <Card>
      <CardHeader title="Recent orders" divided />
      {orders.isPending ? (
        <Skeleton className="m-6 h-[200px]" />
      ) : orders.isError ? (
        <p className="px-6 py-6 text-[13px] text-dim">{handleCmsError(orders.error, "Couldn't load orders.")}</p>
      ) : (
        <DataTable columns={columns} rows={orders.data} rowKey={(o) => o.id} minWidth={720} empty={<Empty text="No orders yet." />} />
      )}
    </Card>
  );
}

export function WixBookings() {
  const trpc = useTRPC();
  const projectId = useRouteProjectId();
  const bookings = useQuery(trpc.wix.bookings.queryOptions({ projectId }, { retry: false }));
  const columns: Column<Booking>[] = [
    {
      key: "when",
      header: "When",
      width: "minmax(180px, 1.4fr)",
      cell: (b) => (
        <span className="font-medium text-ink">
          {b.startAt ? format(parseISO(b.startAt), "EEE, MMM d · h:mm a") : "—"}
        </span>
      ),
    },
    { key: "service", header: "Service", width: "minmax(160px, 1.5fr)", cell: (b) => <span className="truncate">{b.service ?? "—"}</span> },
    { key: "customer", header: "Customer", width: "minmax(150px, 1.5fr)", cell: (b) => <span className="truncate">{b.customer ?? "—"}</span> },
    {
      key: "status",
      header: "Status",
      width: "120px",
      align: "end",
      cell: (b) => <Badge tone={b.status === "CONFIRMED" ? "success" : "neutral"}>{label(b.status)}</Badge>,
    },
  ];
  return (
    <Card>
      <CardHeader title="Upcoming bookings" divided />
      {bookings.isPending ? (
        <Skeleton className="m-6 h-[200px]" />
      ) : bookings.isError ? (
        <p className="px-6 py-6 text-[13px] text-dim">{handleCmsError(bookings.error, "Couldn't load bookings.")}</p>
      ) : (
        <DataTable columns={columns} rows={bookings.data} rowKey={(b) => b.id} minWidth={640} empty={<Empty text="No upcoming bookings." />} />
      )}
    </Card>
  );
}
