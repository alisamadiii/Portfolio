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
import {
  calcExtraPagesCost,
  MAX_EXTRA_PAGES,
  priceForExtraPage,
} from "@workspace/ui/lib/agency-utils";
import { cn, formatPrice } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { RouterOutputs } from "@workspace/trpc/routers/_app";

export default function PortalPage() {
  const trpc = useTRPC();
  const products = useQuery(trpc.agency.getProducts.queryOptions());
  const { data: activeSubscription } = useQuery(
    trpc.agency.activeSubscription.queryOptions()
  );
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
            onClick={() =>
              setExtraPages(Math.min(MAX_EXTRA_PAGES, extraPages + 1))
            }
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <span className="text-muted-foreground text-xs">
          +${formatPrice(priceForExtraPage(extraPages + 1))}/next page
        </span>
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
              isASubscription={!activeSubscription}
            />
          ))
        )}
      </div>
      <div className="border-border/50 mt-4 space-y-4 border-t pt-8">
        <p className="text-muted-foreground/60 text-[11px] leading-relaxed">
          <span className="text-muted-foreground font-medium">
            AliSamadii.LLC
          </span>{" "}
          is a software development and digital services company based in
          Portland, OR. All plans are fully managed — we handle your website,
          hosting, domain, and email end-to-end so you never have to deal with
          technical infrastructure.
        </p>
        <p className="text-muted-foreground/60 text-[11px] leading-relaxed">
          <span className="text-muted-foreground font-medium">
            Ownership & IP.
          </span>{" "}
          All source code, design assets, and proprietary development work
          remain the exclusive intellectual property of AliSamadii.LLC.
          Subscribing gives you a professionally managed web presence — not
          ownership of the underlying codebase. If you need full source code
          ownership, contact us to discuss a custom development project.
        </p>
        <p className="text-muted-foreground/60 text-[11px] leading-relaxed">
          <span className="text-muted-foreground font-medium">Billing.</span>{" "}
          Subscriptions are billed monthly and renew automatically. You can
          cancel at any time — cancellation takes effect at the end of the
          current billing period. Extra pages are billed at $30/page/month for
          pages 4–8, $49.99 for pages 9–13, $70 for pages 14–18, $90 for pages
          19–23, and $110 for pages 24–28 (max 28 pages). No refunds are issued
          for partial months.
        </p>
        <p className="text-muted-foreground/60 text-[11px] leading-relaxed">
          <span className="text-muted-foreground font-medium">
            Service & support.
          </span>{" "}
          All maintenance, updates, and minor copy changes are included.
          Requests are handled on a priority basis depending on your plan. For
          urgent issues or questions, reach us at{" "}
          <a
            href="mailto:agency@alisamadii.com"
            className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            agency@alisamadii.com
          </a>
          .
        </p>
        <p className="text-muted-foreground/60 text-[11px] leading-relaxed">
          <span className="text-muted-foreground font-medium">Privacy.</span> We
          collect only the information necessary to provide your services —
          name, email, billing details, and business information you share with
          us. We do not sell or share your data with third parties. All
          credentials and access information are stored securely and made
          available to you upon request.
        </p>
        <p className="text-muted-foreground/60 text-[11px]">
          By subscribing, you agree to these terms. For questions, contact{" "}
          <a
            href="mailto:agency@alisamadii.com"
            className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            agency@alisamadii.com
          </a>
          .
        </p>
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
  isASubscription,
}: {
  product: RouterOutputs["agency"]["getProducts"][number];
  index: number;
  extraPages: number;
  isASubscription?: boolean;
}) => {
  const trpc = useTRPC();
  const { data: isActive } = useQuery(
    trpc.agency.isActive.queryOptions({ productId: product.id })
  );
  const checkout = useMutation(trpc.agency.createCheckout.mutationOptions());

  const description = product?.description ?? "";
  const { bullets, details } = splitDescription(description);
  const totalPages = 3 + extraPages;
  const collapsedContent = (bullets || description).replace(
    /3 pages included/,
    `${totalPages} page${totalPages !== 1 ? "s" : ""} included`
  );
  const hasDetails = details.length > 0;

  const basePrice = product?.priceAmount ?? 0;
  const totalPrice = basePrice + calcExtraPagesCost(extraPages);

  return (
    <CardAgency.Card
      className={cn(
        "gap-4 p-5",
        isActive ? "outline-primary bg-primary/10 outline outline-2" : ""
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base leading-snug font-bold">
          {product?.name || ""}
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
      </div>
      <div className="mt-auto w-full">
        {isActive ? (
          <Button variant="outline" size="lg" className="w-full" disabled>
            Subscribed
          </Button>
        ) : isASubscription ? (
          <Button variant="outline" size="lg" className="w-full" asChild>
            <a href="mailto:agency@alisamadii.com">Contact Support</a>
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
    </CardAgency.Card>
  );
};
