"use client";

import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
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
      <div className="flex items-start justify-between">
        <CardAgency.Header title={`#${index + 1} ${product?.name || ""}`} />
        <p className="text-5xl font-black tracking-tighter tabular-nums">
          ${product?.priceAmount ? formatPrice(product.priceAmount) : "N/A"}
          {product?.recurringInterval && (
            <span className="text-muted-foreground text-lg font-normal tracking-normal">
              /{product.recurringInterval}
            </span>
          )}
        </p>
      </div>
      <div className="grid gap-5">
        <div
          className={cn(
            "text-muted-foreground text-sm leading-relaxed",
            "[&_p]:mb-3 [&_p:last-child]:mb-0",
            "[&_strong]:text-foreground [&_strong]:font-semibold",
            "[&_ul]:my-2 [&_ul]:ml-1 [&_ul]:list-inside [&_ul]:list-disc [&_ul]:space-y-1",
            "[&_li]:text-muted-foreground [&_li]:marker:text-primary/60",
            "[&_a]:text-primary [&_a:hover]:text-primary/80 [&_a]:underline [&_a]:underline-offset-2"
          )}
        >
          <ReactMarkdown>{product?.description ?? "-"}</ReactMarkdown>
        </div>

        <CardAgency.DetailRow
          label="Recurring interval"
          value={product?.recurringInterval || ""}
        />
        {product?.services?.length > 0 && (
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
        )}

        <div className="sticky bottom-4 w-full">
          {isActive ? (
            <Button variant="outline" size="lg" className="w-full">
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
              className="w-full"
              isLoading={checkout.isPending}
            >
              {product?.recurringInterval === null
                ? `Purchase $${formatPrice(product.priceAmount)}`
                : `Subscribe $${formatPrice(product.priceAmount)}`}
            </Button>
          )}
        </div>
      </div>
    </CardAgency.Card>
  );
};
