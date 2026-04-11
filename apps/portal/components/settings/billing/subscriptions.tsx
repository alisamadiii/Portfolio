import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addMonths, addYears, format, formatDistanceToNow } from "date-fns";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Separator } from "@workspace/ui/components/separator";
import { DataTable } from "@workspace/ui/custom/data-table";
import { PageLoading } from "@workspace/ui/custom/page-loading";
import { cn } from "@workspace/ui/lib/utils";

import { queryClient, useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import {
  useCheckout,
  useIsUserHaveAccess,
  useSwitchPlan,
} from "@workspace/auth/hooks/use-payments";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

export const BillingSubscriptions = () => {
  const { data: user } = useCurrentUser();
  const trpc = useTRPC();
  const { data: subscriptions, isPending } = useQuery(
    trpc.payments.getSubscriptions.queryOptions(
      {
        userId: user?.user.id || "",
      },
      {
        enabled: !!user?.user.id,
      }
    )
  );
  const getProducts = useQuery(trpc.payments.getProducts.queryOptions());

  // Helper function to get next billing date
  const getNextBillingDate = (
    subscription: RouterOutputs["payments"]["getSubscriptions"][number]
  ) => {
    if (!subscription.startedAt) return null;

    const startDate = new Date(subscription.startedAt);
    const interval = subscription.recurringInterval;

    if (interval === "month") {
      return addMonths(startDate, 1);
    } else if (interval === "year") {
      return addYears(startDate, 1);
    }
    return null;
  };

  // Helper function to format currency
  const formatCurrency = (amount: number, currency: string = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100); // Assuming amount is in cents
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscriptions</CardTitle>
      </CardHeader>
      <DataTable
        isLoading={isPending || getProducts.isPending}
        columns={[
          {
            id: "plan",
            header: "Plan",
            cell: ({ row }) => {
              const product = getProducts.data?.find(
                (product) => product.id === row.original.productId
              );
              return (
                <div className="flex flex-col">
                  <Badge variant="outline" className="w-fit">
                    {product?.name.replace("month", "").replace("year", "")}
                  </Badge>
                  {row.original.status === "trialing" && (
                    <Badge variant="secondary" className="mt-1 w-fit text-xs">
                      Trial
                    </Badge>
                  )}
                </div>
              );
            },
          },
          {
            id: "status",
            header: "Status",
            cell: ({ row }) => (
              <Badge
                variant={
                  row.original.status === "active" ||
                  row.original.status === "trialing"
                    ? "default"
                    : row.original.status === "canceled"
                      ? "destructive"
                      : "secondary"
                }
              >
                {row.original.status}
              </Badge>
            ),
          },
          {
            id: "amount",
            header: "Amount",
            cell: ({ row }) => (
              <div className="flex flex-col">
                <span className="font-medium">
                  {formatCurrency(row.original.amount, row.original.currency)}
                </span>
                <span className="text-muted-foreground text-sm">
                  /{row.original.recurringInterval}
                </span>
              </div>
            ),
          },
          {
            id: "next_billing",
            header: "Next Billing",
            cell: ({ row }) => {
              const nextBilling = getNextBillingDate(row.original);
              return (
                <span className="flex flex-col">
                  <span className="text-sm">
                    {nextBilling ? format(nextBilling, "MMM dd, yyyy") : "-"}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {nextBilling
                      ? formatDistanceToNow(nextBilling, { addSuffix: true })
                      : "-"}
                  </span>
                </span>
              );
            },
          },
          {
            id: "auto_renewal",
            header: "Auto-Renewal",
            cell: ({ row }) => (
              <Badge
                variant={
                  row.original.cancelAtPeriodEnd ? "destructive" : "default"
                }
              >
                {row.original.cancelAtPeriodEnd ? "Off" : "On"}
              </Badge>
            ),
          },
          {
            id: "created_at",
            header: "Created",
            cell: ({ row }) => (
              <span className="text-sm">
                {row.original.createdAt
                  ? format(row.original.createdAt, "MMM dd, yyyy")
                  : "-"}
              </span>
            ),
          },
        ]}
        data={subscriptions || []}
      />
      <UpgradeSection />
    </Card>
  );
};

const UpgradeSection = () => {
  const trpc = useTRPC();
  const getProducts = useQuery(trpc.payments.getProducts.queryOptions());

  return (
    <>
      <CardHeader>Upgrade</CardHeader>
      <CardContent className="p-0">
        {getProducts.data
          ?.filter((product) => !product.isArchived)
          .map((product) => (
            <Fragment key={product.id}>
              <EachProduct product={product} />
              <Separator />
            </Fragment>
          ))}
      </CardContent>
    </>
  );
};

interface EachProductProps {
  product: RouterOutputs["payments"]["getProducts"][number];
}

const EachProduct = ({ product }: EachProductProps) => {
  const [open, setOpen] = useState(false);
  const [immediateUpdate, setImmediateUpdate] = useState(false);

  const { isUserHaveAccess, currentProductId, data } = useIsUserHaveAccess();
  const checkout = useCheckout();
  const switchPlan = useSwitchPlan();

  // Determine if the button should say "Upgrade" or "Downgrade" based on price comparison
  const trpc = useTRPC();
  const products = useQuery(trpc.payments.getProducts.queryOptions());
  const filteredProducts = products.data?.filter((p) => !p.isArchived) || [];
  const currentProduct = filteredProducts.find(
    (p) => p.id === currentProductId
  );

  // If user has no current subscription, it's always an upgrade
  // If user has a subscription, compare prices
  const isDowngrade = currentProduct
    ? product.priceAmount < currentProduct.priceAmount
    : false;

  const handleUpgrade = (
    product: RouterOutputs["payments"]["getProducts"][number]
  ) => {
    if (isUserHaveAccess) {
      switchPlan.mutate(
        {
          subscriptionId: data?.data?.activeSubscriptions?.[0]?.id || "",
          toProductId: product.id,
          prorationBehavior: immediateUpdate ? "invoice" : "prorate",
        },
        {
          onSuccess: () => {
            setOpen(false);
            queryClient.invalidateQueries({
              queryKey: trpc.payments.getOrders.queryKey(),
            });
          },
        }
      );
    } else {
      checkout.mutate({
        productId: product.id,
        successUrl: "/portfolio",
      });
    }
  };

  return (
    <div key={product.id} className="flex items-center justify-between p-6">
      <div className="flex flex-col">
        <h3>
          {product.name}{" "}
          <span className="text-muted-foreground text-sm">
            {product.priceAmount / 100}/{product.recurringInterval}
          </span>
        </h3>
        <p className="text-muted-foreground text-sm whitespace-pre-line">
          {product.description}
        </p>
      </div>
      {currentProductId !== product.id ? (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button>{isDowngrade ? "Downgrade" : "Upgrade"}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isDowngrade ? "Downgrade" : "Upgrade"}
              </AlertDialogTitle>
            </AlertDialogHeader>
            <div className={cn("space-y-4", isDowngrade && "opacity-50")}>
              <p className="text-muted-foreground text-sm">
                Choose when you want your plan to be updated:
              </p>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="immediate-update"
                  checked={immediateUpdate}
                  onCheckedChange={(checked) =>
                    setImmediateUpdate(checked as boolean)
                  }
                  disabled={isDowngrade}
                />
                <label
                  htmlFor="immediate-update"
                  className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Apply changes immediately
                </label>
              </div>
              <p className="text-muted-foreground text-xs">
                {immediateUpdate
                  ? "Your plan will be updated immediately and you'll be charged the prorated amount."
                  : "Your plan will be updated at your next billing cycle. No immediate charges."}
              </p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button variant="outline">Cancel</Button>
              </AlertDialogCancel>
              <Button onClick={() => handleUpgrade(product)}>
                {isDowngrade ? "Downgrade" : "Upgrade"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button
          variant={currentProductId === product.id ? "outline" : undefined}
          disabled={currentProductId === product.id}
          onClick={() => handleUpgrade(product)}
        >
          {currentProductId === product.id
            ? "Current Plan"
            : isUserHaveAccess
              ? "Upgrade"
              : "Purchase"}
        </Button>
      )}

      <PageLoading active={checkout.isPending} name="Creating" />
      <PageLoading active={switchPlan.isPending} name="Switching" />
    </div>
  );
};
