"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

import { CardAgency } from "@workspace/ui/agency/card-agency";
import { Button } from "@workspace/ui/components/button";
import { Spinner } from "@workspace/ui/components/spinner";
import { RequestDialog } from "@workspace/ui/custom/request-dialog";
import { cn, formatPrice } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { RouterOutputs } from "@workspace/trpc/routers/_app";
import { useCheckout } from "@workspace/auth/hooks/use-payments";

export default function PortalPage() {
  const trpc = useTRPC();
  const products = useQuery(trpc.agency.getProducts.queryOptions());

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Product details</h1>
        <RequestDialog>
          <Button>Contact Support</Button>
        </RequestDialog>
      </div>
      <div className="space-y-5">
        {products.isLoading ? (
          <div className="flex items-center justify-center pb-4">
            <Spinner />
          </div>
        ) : !products.data ? (
          <div className="text-muted-foreground flex items-center justify-center py-10">
            There is no product created yet.
          </div>
        ) : (
          products.data.map((product, index) => (
            <EachProduct key={product.id} product={product} index={index} />
          ))
        )}
      </div>
    </div>
  );
}

const EachProduct = ({
  product,
  index,
}: {
  product: RouterOutputs["agency"]["getProducts"][number];
  index: number;
}) => {
  const trpc = useTRPC();
  const { data: isActive } = useQuery(
    trpc.agency.isActive.queryOptions({ productId: product.id })
  );

  const checkout = useCheckout();

  return (
    <CardAgency.Card
      className={cn(
        isActive ? "outline-primary bg-primary/10 outline outline-2" : ""
      )}
    >
      <CardAgency.Header title={`#${index + 1}`} />
      <div className="grid gap-5">
        <CardAgency.DetailRow label="Name" value={product?.name || ""} />
        <CardAgency.DetailRow label="Description">
          <div
            className="line-clamp-2 text-sm"
            dangerouslySetInnerHTML={{
              __html: product?.description ?? "-",
            }}
          />
        </CardAgency.DetailRow>

        <CardAgency.DetailRow
          label="Recurring interval"
          value={product?.recurringInterval || ""}
        />
        <CardAgency.DetailRow
          label="Created at"
          value={format(
            product?.createdAt ? new Date(product.createdAt) : new Date(),
            "MMMM d, yyyy"
          )}
        />
        <CardAgency.DetailRow label="Services">
          {product?.services?.map((service) => (
            <p
              key={service.name}
              className="flex shrink-0 items-center justify-between gap-4"
            >
              {service.name} <span>${formatPrice(service.price)}</span>
            </p>
          ))}
        </CardAgency.DetailRow>
        <CardAgency.DetailRow label="Price">
          <span className="text-3xl font-bold tracking-tighter tabular-nums">
            ${formatPrice(product?.priceAmount ?? 0)}
          </span>
        </CardAgency.DetailRow>

        {isActive ? (
          <Button variant="outline" size="lg">
            <span>
              {product?.recurringInterval === null ? "Purchased" : "Active"}
            </span>
          </Button>
        ) : (
          <Button
            onClick={() =>
              checkout.mutate(
                {
                  productId: product?.id ?? "",
                  successUrl: window.location.href,
                },
                {
                  onSuccess: () => {
                    toast.success("Subscription created");
                  },
                  onError: (error) => {
                    toast.error(error.message);
                  },
                }
              )
            }
            size="lg"
            isLoading={checkout.isPending}
          >
            {product?.recurringInterval === null ? "Purchase" : "Subscribe"}
          </Button>
        )}
      </div>
    </CardAgency.Card>
  );
};
