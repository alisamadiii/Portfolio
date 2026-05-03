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

export const Subscriptions = () => {
  const { id } = useParams<{ id: string }>();

  const trpc = useTRPC();
  const { data: user } = useQuery(
    trpc.users.get.queryOptions(id, {
      enabled: !!id,
    })
  );

  const { data: subscriptions, isPending } = useQuery(
    trpc.billing.getSubscriptions.queryOptions(
      {
        userId: user?.id || "",
      },
      {
        enabled: !!user?.id,
      }
    )
  );

  // Calculate financial metrics
  const totalRevenue =
    subscriptions?.reduce(
      (acc, subscription) => acc + subscription.totalAmount,
      0
    ) || 0;

  const totalRefunded =
    subscriptions?.reduce((acc, subscription) => {
      if (subscription.canceledAt) {
        return acc + subscription.totalAmount;
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
                {row.original.periodStart
                  ? differenceInDays(
                      new Date(),
                      new Date(row.original.periodStart)
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
                  row.original.status === "active" ? "default" : "destructive"
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
            id: "billing_interval",
            header: "Billing Interval",
            cell: ({ row }) => (
              <Badge>{row.original.billingInterval ?? "—"}</Badge>
            ),
          },
          {
            id: "cancelAtPeriodEnd",
            header: "Cancel At Period End",
            cell: ({ row }) => (
              <code className="text-xs">
                {JSON.stringify(row.original.cancelAtPeriodEnd)}
              </code>
            ),
          },
          {
            id: "period_start",
            header: "Period Start",
            cell: ({ row }) => (
              <span>
                {row.original.periodStart
                  ? format(
                      new Date(row.original.periodStart),
                      "MM/dd/yyyy hh:mm a"
                    )
                  : "—"}
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
                    <DialogTitle>Subscription Details</DialogTitle>
                  </DialogHeader>
                  <FormattedJSON data={row.original} />
                </DialogContent>
              </Dialog>
            ),
          },
        ]}
        data={subscriptions || []}
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
