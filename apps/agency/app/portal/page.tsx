"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Minus, Plus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { CardAgency } from "@workspace/ui/agency/card-agency";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Spinner } from "@workspace/ui/components/spinner";
import { RequestDialog } from "@workspace/ui/custom/request-dialog";
import { cn, formatPrice } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { RouterOutputs } from "@workspace/trpc/routers/_app";

export default function PortalPage() {
  const trpc = useTRPC();
  const products = useQuery(trpc.agency.getProducts.queryOptions());
  const [extraPages, setExtraPages] = useState(0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Product details</h1>
        <RequestDialog>
          <Button>Contact Support</Button>
        </RequestDialog>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-muted-foreground text-sm">Pages</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExtraPages(Math.max(0, extraPages - 1))}
            disabled={extraPages === 0}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-4 text-center text-sm font-medium tabular-nums">
            {3 + extraPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExtraPages(extraPages + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <span className="text-muted-foreground text-xs">+$20/extra page</span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {products.isLoading ? (
          <div className="col-span-full flex items-center justify-center pb-4">
            <Spinner />
          </div>
        ) : !products.data ? (
          <div className="text-muted-foreground col-span-full flex items-center justify-center py-10">
            There is no product created yet.
          </div>
        ) : (
          products.data.map((product, index) => (
            <EachProduct
              key={product.id}
              product={product}
              index={index}
              extraPages={extraPages}
            />
          ))
        )}
      </div>
    </div>
  );
}

function splitDescription(description: string): {
  bullets: string;
  details: string;
} {
  const parts = description.split(/\n\n+/);
  let bulletEnd = 0;
  for (let i = 0; i < parts.length; i++) {
    const isListBlock = parts[i]!.trim()
      .split("\n")
      .every(
        (l) =>
          l.trim().startsWith("- ") ||
          l.trim().startsWith("* ") ||
          l.trim() === ""
      );
    if (isListBlock && parts[i]!.trim() !== "") {
      bulletEnd = i + 1;
    } else {
      break;
    }
  }
  return {
    bullets: parts.slice(0, bulletEnd).join("\n\n"),
    details: parts.slice(bulletEnd).join("\n\n").trim(),
  };
}

const mdStyles = cn(
  "text-muted-foreground text-sm leading-relaxed",
  "[&_p]:mb-3 [&_p:last-child]:mb-0",
  "[&_strong]:text-foreground [&_strong]:font-semibold",
  "[&_ul]:my-2 [&_ul]:ml-1 [&_ul]:list-inside [&_ul]:list-disc [&_ul]:space-y-1",
  "[&_li]:text-muted-foreground [&_li]:marker:text-primary/60",
  "[&_a]:text-primary [&_a:hover]:text-primary/80 [&_a]:underline [&_a]:underline-offset-2"
);

const EachProduct = ({
  product,
  index,
  extraPages,
}: {
  product: RouterOutputs["agency"]["getProducts"][number];
  index: number;
  extraPages: number;
}) => {
  const trpc = useTRPC();
  const { data: isActive } = useQuery(
    trpc.agency.isActive.queryOptions({ productId: product.id })
  );
  const checkout = useMutation(trpc.agency.createCheckout.mutationOptions());

  const description = product?.description ?? "";
  const { bullets, details } = splitDescription(description);
  const collapsedContent = bullets || description;
  const isFullService = product?.priceAmount === 30000;
  const hasDetails = details.length > 0 && !isFullService;

  const basePrice = product?.priceAmount ?? 0;
  const totalPrice = basePrice + extraPages * 2000;

  return (
    <CardAgency.Card
      className={cn(
        "gap-4 p-5",
        isActive ? "outline-primary bg-primary/10 outline outline-2" : ""
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base leading-snug font-bold">
          {`#${index + 1} ${product?.name || ""}`}
        </h2>
        <div className="shrink-0 text-right">
          <p className="text-3xl font-black tracking-tighter tabular-nums">
            ${product?.priceAmount ? formatPrice(totalPrice) : "N/A"}
            {product?.recurringInterval && (
              <span className="text-muted-foreground text-sm font-normal tracking-normal">
                /{product.recurringInterval}
              </span>
            )}
          </p>
          {extraPages > 0 && (
            <p className="text-muted-foreground mt-0.5 text-xs">
              +{extraPages} extra page{extraPages > 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-5">
        <div className={mdStyles}>
          <ReactMarkdown>{collapsedContent}</ReactMarkdown>
          {hasDetails && (
            <Dialog>
              <DialogTrigger asChild>
                <button className="text-primary hover:text-primary/80 mt-2 text-xs underline underline-offset-2 transition-colors">
                  Show full details
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{product?.name}</DialogTitle>
                </DialogHeader>
                <div className={cn(mdStyles, "mt-2")}>
                  <ReactMarkdown>{description}</ReactMarkdown>
                </div>
              </DialogContent>
            </Dialog>
          )}
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
                    extraPages,
                  },
                  {
                    onSuccess: (data) => {
                      if (data?.url) window.location.href = data.url;
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
                ? `Purchase $${formatPrice(totalPrice)}`
                : `Subscribe $${formatPrice(totalPrice)}`}
            </Button>
          )}
        </div>
      </div>
    </CardAgency.Card>
  );
};
