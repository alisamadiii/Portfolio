import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { differenceInDays, format } from "date-fns";
import { Braces } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { DataTable } from "@workspace/ui/custom/data-table";

import { useTRPC } from "@workspace/trpc/client";

import { FormattedJSON } from "@/components/json-format";

export const Orders = () => {
  const { id } = useParams<{ id: string }>();

  const trpc = useTRPC();
  const { data: user } = useQuery(
    trpc.admin.users.getById.queryOptions(id, {
      enabled: !!id,
    })
  );

  const { data: orders, isPending } = useQuery(
    trpc.payments.getOrders.queryOptions(
      {
        userId: user?.id || "",
        email: user?.email || "",
      },
      {
        enabled: !!user?.id || !!user?.email,
        refetchOnWindowFocus: true,
      }
    )
  );

  // Calculate financial metrics
  const totalRevenue =
    orders?.reduce((acc, order) => acc + order.totalAmount, 0) || 0;

  const totalRefunded =
    orders?.reduce((acc, order) => {
      if (order.status === "refunded") {
        return acc + order.totalAmount;
      } else if (order.status === "partially_refunded") {
        // Assuming 50% refund for partially refunded orders
        // You may want to adjust this or add a refund_amount field to the schema
        return acc + order.totalAmount * 0.5;
      }
      return acc;
    }, 0) || 0;

  const netProfit = totalRevenue - totalRefunded;

  return (
    <div>
      <DataTable
        isLoading={isPending}
        columns={[
          {
            id: "id",
            header: "ID",
            cell: ({ row }) => <Badge>{row.original.id}</Badge>,
          },
          {
            id: "can_request_refund",
            header: "Can Request Refund",
            cell: ({ row }) => (
              <code className="bg-muted rounded-md p-1 text-xs">
                {row.original.createdAt
                  ? differenceInDays(
                      new Date(),
                      new Date(row.original.createdAt)
                    ) <= 7
                    ? "true"
                    : "false"
                  : "-"}
              </code>
            ),
          },
          {
            id: "status",
            header: "Status",
            cell: ({ row }) => (
              <Badge
                variant={
                  row.original.status === "paid"
                    ? "default"
                    : row.original.status === "pending"
                      ? "secondary"
                      : "destructive"
                }
              >
                {row.original.status}
              </Badge>
            ),
          },
          {
            id: "total_amount",
            header: "Amount",
            cell: ({ row }) => (
              <span>${(row.original.totalAmount / 100).toFixed(2)}</span>
            ),
          },
          {
            id: "billing_reason",
            header: "Billing Reason",
            cell: ({ row }) => <Badge>{row.original.billingReason}</Badge>,
          },
          {
            id: "created_at",
            header: "Created At",
            cell: ({ row }) => (
              <span>
                {format(
                  row.original.createdAt ?? new Date(),
                  "MM/dd/yyyy hh:mm a"
                )}
              </span>
            ),
          },
          {
            id: "json-data",
            cell: ({ row }) => (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Braces />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Order Details</DialogTitle>
                  </DialogHeader>
                  <FormattedJSON data={row.original} />
                </DialogContent>
              </Dialog>
            ),
          },
        ]}
        data={orders || []}
      />
      <div className="bg-muted text-muted-foreground -mt-3 rounded-b-xl p-4 pt-7 text-xs">
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-foreground text-lg font-medium">Total Revenue</p>
            <p className="text-xl">${(totalRevenue / 100).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-foreground text-lg font-medium">
              Total Refunded
            </p>
            <p className="text-xl text-red-600">
              ${(totalRefunded / 100).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-foreground text-lg font-medium">Net Profit</p>
            <p
              className={`text-xl ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              ${(netProfit / 100).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
