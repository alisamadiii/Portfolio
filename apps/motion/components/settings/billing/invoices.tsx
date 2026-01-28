import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { MoreHorizontal } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { DataTable } from "@workspace/ui/custom/data-table";
import { PageLoading } from "@workspace/ui/custom/page-loading";

import { useTRPC } from "@workspace/trpc/client";
import { RouterOutputs } from "@workspace/trpc/routers/_app";
import { useGeneratePortalLink } from "@workspace/auth/hooks/use-payments";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

export const BillingInvoices = () => {
  const { data: user } = useCurrentUser();

  const trpc = useTRPC();
  const { data: orders, isPending } = useQuery(
    trpc.payments.getOrders.queryOptions(
      {
        userId: user?.user.id || "",
        email: user?.user.email || "",
      },
      {
        enabled: !!user?.user.id || !!user?.user.email,
        refetchOnWindowFocus: true,
      }
    )
  );

  const generatePortalLink = useGeneratePortalLink();

  // Memoize filtered data to prevent unnecessary re-renders
  const ordersByUserId = useMemo(
    () => orders?.filter((order) => order.userId === user?.user.id) || [],
    [orders, user?.user.id]
  );

  const ordersByEmail = useMemo(
    () =>
      orders?.filter(
        (order) =>
          order.email === user?.user.email && order.userId !== user?.user.id
      ) || [],
    [orders, user?.user.email, user?.user.id]
  );

  // Memoize columns to prevent recreation on every render
  const columnsByUserId = useMemo(
    () => [
      {
        id: "date",
        cell: ({
          row,
        }: {
          row: { original: RouterOutputs["payments"]["getOrders"][number] };
        }) => (
          <span className="text-muted-foreground flex items-center gap-2 font-medium">
            <span className="flex flex-col">
              <span className="text-muted-foreground text-xs">
                {" "}
                #{row.original.invoiceNumber}{" "}
              </span>
              <span>
                {row.original.createdAt
                  ? format(row.original.createdAt, "MMMM d")
                  : "-"}
              </span>
            </span>
            <Badge
              variant={
                row.original.totalAmount < 0
                  ? "secondary" // Green-ish for refunds
                  : row.original.status === "paid"
                    ? "default"
                    : "destructive"
              }
            >
              {row.original.totalAmount < 0 ? "refunded" : row.original.status}
            </Badge>
          </span>
        ),
      },
      {
        id: "amount",
        cell: ({
          row,
        }: {
          row: { original: RouterOutputs["payments"]["getOrders"][number] };
        }) => {
          const amount = row.original.totalAmount / 100;
          const isRefund = amount < 0;

          return (
            <span className="flex flex-col">
              <span className="font-medium">
                {isRefund ? "Refunded" : "Total due"}
              </span>
              <span
                className={`${isRefund ? "text-green-600" : "text-muted-foreground"}`}
              >
                {isRefund
                  ? `$${Math.abs(amount).toFixed(2)}`
                  : `$${amount.toFixed(2)}`}
              </span>
            </span>
          );
        },
      },
      {
        id: "invoice_created",
        cell: ({
          row,
        }: {
          row: { original: RouterOutputs["payments"]["getOrders"][number] };
        }) => (
          <span className="flex flex-col">
            <span className="text-muted-foreground">
              Invoiced{" "}
              {row.original.createdAt
                ? format(row.original.createdAt, "MMM d, yyyy")
                : "-"}
            </span>
            <span className="text-muted-foreground text-xs">
              {row.original.createdAt
                ? format(row.original.createdAt, "hh:mm a")
                : "-"}
            </span>
          </span>
        ),
      },
      {
        id: "action",
        cell: () => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => generatePortalLink.mutate()}>
                View Invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [generatePortalLink]
  );

  const columnsByEmail = useMemo(
    () => [
      {
        id: "date",
        cell: ({
          row,
        }: {
          row: { original: RouterOutputs["payments"]["getOrders"][number] };
        }) => (
          <span className="text-muted-foreground flex items-center gap-2 font-medium">
            <span className="flex flex-col">
              <span className="text-muted-foreground text-xs">
                #{row.original.invoiceNumber}
              </span>
              <span>
                {row.original.createdAt
                  ? format(row.original.createdAt, "MMMM d")
                  : "-"}
              </span>
            </span>
            <Badge
              variant={
                row.original.totalAmount < 0
                  ? "secondary" // Green-ish for refunds
                  : row.original.status === "paid"
                    ? "default"
                    : "destructive"
              }
            >
              {row.original.totalAmount < 0 ? "refunded" : row.original.status}
            </Badge>
          </span>
        ),
      },
      {
        id: "amount",
        cell: ({
          row,
        }: {
          row: { original: RouterOutputs["payments"]["getOrders"][number] };
        }) => {
          const amount = row.original.totalAmount / 100;
          const isRefund = row.original.status === "refunded";

          return (
            <span className="flex flex-col">
              <span className="font-medium">
                {isRefund ? "Refunded" : "Total due"}
              </span>
              <span
                className={`${isRefund ? "text-green-600" : "text-muted-foreground"}`}
              >
                {isRefund
                  ? `$${Math.abs(amount).toFixed(2)}`
                  : `$${amount.toFixed(2)}`}
              </span>
            </span>
          );
        },
      },
      {
        id: "invoice_created",
        cell: ({
          row,
        }: {
          row: { original: RouterOutputs["payments"]["getOrders"][number] };
        }) => (
          <span className="flex flex-col">
            <span className="text-muted-foreground">
              Invoiced{" "}
              {row.original.createdAt
                ? format(row.original.createdAt, "MMM d, yyyy")
                : "-"}
            </span>
            <span className="text-muted-foreground text-xs">
              {row.original.createdAt
                ? format(row.original.createdAt, "hh:mm a")
                : "-"}
            </span>
          </span>
        ),
      },
      {
        id: "action",
        cell: ({
          row,
        }: {
          row: { original: RouterOutputs["payments"]["getOrders"][number] };
        }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="flex flex-col items-start gap-0"
                disabled
              >
                View Invoice
                <p className="text-muted-foreground text-[10px] tracking-tight">
                  Past invoices cannot currently be viewed in Polar Portal.
                </p>
              </DropdownMenuItem>
              <a
                href={`mailto:support@${process.env.NEXT_PUBLIC_EMAIL_DOMAIN}?subject=Invoice%20Request&body=Hello%2C%0A%0AI%20would%20like%20to%20request%20a%20copy%20of%20my%20invoice.%20My%20account%20email%20address%20is%20${encodeURIComponent(
                  user?.user.email || ""
                )}.%0AInvoice%20Number%3A%20${encodeURIComponent(
                  row.original.invoiceNumber || ""
                )}%0A%0AThank%20you!`}
              >
                <DropdownMenuItem>Request Invoice</DropdownMenuItem>
              </a>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [user?.user.email]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
      </CardHeader>
      <h2 className="text-muted-foreground relative z-10 -mb-6 mt-4 px-6 text-sm">
        Sorted by ID
      </h2>
      <DataTable
        isLoading={isPending}
        columns={columnsByUserId}
        data={ordersByUserId}
      />
      <h2 className="text-muted-foreground relative z-10 -mb-6 mt-4 px-6 text-sm">
        Sorted by Email (Previous orders)
      </h2>
      <DataTable
        isLoading={isPending}
        columns={columnsByEmail}
        data={ordersByEmail}
      />

      <PageLoading
        active={generatePortalLink.isPending || generatePortalLink.isSuccess}
        name={generatePortalLink.isSuccess ? "Redirecting" : "Generating"}
      />
    </Card>
  );
};
