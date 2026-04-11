import { useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { Badge } from "@workspace/ui/components/badge";
import { buttonVariants } from "@workspace/ui/components/button";
import { urls } from "@workspace/ui/lib/company";
import { design } from "@workspace/ui/lib/design";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

// @react-pdf/renderer is browser-only — skip SSR for the whole button
const InvoiceDownloadButton = dynamic(
  () =>
    import("./invoice-download-button").then((m) => m.InvoiceDownloadButton),
  { ssr: false }
);

export const BillingInvoices = () => {
  const { data: user } = useCurrentUser();

  const trpc = useTRPC();
  const { data: orders } = useQuery(
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

  // Memoize filtered data to prevent unnecessary re-renders
  const ordersByUserId = useMemo(
    () => orders?.filter((order) => order.userId === user?.user.id) || [],
    [orders, user?.user]
  );

  return (
    <div className="space-y-4">
      <h3 className="text-muted-foreground relative z-10 mt-4 text-sm">
        Orders
      </h3>
      {ordersByUserId.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
          <p className="text-muted-foreground text-sm">No orders yet</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {ordersByUserId.map((order) => {
          const amount = order.totalAmount / 100;
          const isRefund = amount < 0;
          const createdAtLabel = order.createdAt
            ? format(order.createdAt, "MMM d, yyyy")
            : "Date pending";
          const timeLabel = order.createdAt
            ? format(order.createdAt, "hh:mm a")
            : "Time pending";

          return (
            <div
              key={order.id}
              className="bg-primary shadow-dialog aspect-16/8 rounded-xl p-4 text-white"
              style={{
                backgroundColor:
                  order.project === "MOTION"
                    ? design.motion.color
                    : order.project === "AGENCY"
                      ? design.agency.color
                      : undefined,
              }}
            >
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs tracking-[0.2em] text-white/70 uppercase">
                    Invoice
                  </p>
                  <p className="text-sm font-semibold">
                    {order.invoiceNumber || "Pending"}
                  </p>
                </div>
                <Badge
                  variant={
                    order.totalAmount < 0
                      ? "secondary"
                      : order.status === "paid"
                        ? "default"
                        : "destructive"
                  }
                >
                  {order.totalAmount < 0 ? "refunded" : order.status}
                </Badge>
              </div>
              <div className="relative z-10 mt-4 grid grid-cols-2 gap-3 text-xs text-white/80">
                <div>
                  <p className="text-white/60">Amount</p>
                  <code className="text-sm font-semibold text-white">
                    {isRefund
                      ? `-$${Math.abs(amount).toFixed(2)}`
                      : `$${amount.toFixed(2)}`}
                  </code>
                </div>
                <div>
                  <p className="text-white/60">Date</p>
                  <p className="text-sm font-semibold text-white">
                    {createdAtLabel}
                  </p>
                  <p className="text-[11px] text-white/60">{timeLabel}</p>
                </div>
                <div>
                  <p className="text-white/60">Product</p>
                  <code className="text-sm font-semibold text-white">
                    {order.productId.slice(0, 10) + "..." || "—"}
                  </code>
                </div>
                <div>
                  <p className="text-white/60">Status note</p>
                  <p className="text-sm font-semibold text-white">
                    {isRefund ? "Refund processed" : "Purchase confirmed"}
                  </p>
                </div>
              </div>
              <Link
                href={
                  order.project === "MOTION"
                    ? `${urls.motion}`
                    : order.project === "AGENCY"
                      ? `/agency`
                      : "#"
                }
                className={buttonVariants({
                  variant: "outline",
                  className: "mt-4 w-full text-xs text-black",
                })}
              >
                Visit
              </Link>
              <InvoiceDownloadButton
                order={{
                  ...order,
                  createdAt: order.createdAt ? new Date(order.createdAt) : null,
                }}
                userName={user?.user.name}
                userPhone={user?.user.phone}
                userCompany={user?.user.company}
                userAddress={user?.user.address}
              />
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};
