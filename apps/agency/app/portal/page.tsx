"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { CardAgency } from "@workspace/ui/agency/card-agency";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Spinner } from "@workspace/ui/components/spinner";
import { RequestDialog } from "@workspace/ui/custom/request-dialog";
import { cn, formatPrice } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { RouterOutputs } from "@workspace/trpc/routers/_app";

export default function PortalPage() {
  const trpc = useTRPC();
  const products = useQuery(trpc.agency.getProducts.queryOptions());

  const standardProducts = products.data?.filter((p) => !p.userId) ?? [];
  const customProducts = products.data?.filter((p) => !!p.userId) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Product details</h1>
        <RequestDialog>
          <Button>Contact Support</Button>
        </RequestDialog>
      </div>

      {/* Standard plans */}
      <div className="space-y-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Available Plans
        </h2>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {products.isLoading ? (
            <div className="col-span-full flex items-center justify-center pb-4">
              <Spinner />
            </div>
          ) : (
            standardProducts.map((product) => (
              <EachProduct key={product.id} product={product} />
            ))
          )}
        </div>
      </div>

      {/* Your Plan — custom products + request card */}
      <div className="space-y-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Your Plan
        </h2>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {customProducts.map((product) => (
            <EachProduct key={product.id} product={product} />
          ))}
          <CardAgency.Card className="gap-4 p-5">
            <div className="flex flex-1 flex-col justify-between gap-6">
              <div className="flex flex-col gap-2">
                <h2 className="text-base leading-snug font-bold">
                  Custom Product
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Need something specific? Request a unique plan tailored to
                  your business — custom services, pricing, and scope.
                </p>
              </div>
              <RequestDialog defaultSubject="Request a Custom Product">
                <p className="text-primary cursor-pointer text-sm font-medium underline underline-offset-4">
                  Request a custom or unique product &rarr;
                </p>
              </RequestDialog>
            </div>
          </CardAgency.Card>
        </div>
      </div>

      <div className="border-border/50 mt-4 space-y-4 border-t pt-8">
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          <span className="font-bold">AliSamadii.LLC</span> is a software
          development and digital services company based in Portland, OR. All
          plans are fully managed — we handle your website, hosting, domain, and
          email end-to-end so you never have to deal with technical
          infrastructure.
        </p>
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          <span className="font-bold">Please note.</span> This is a fully
          managed service subscription. The source code, underlying codebase,
          and all proprietary development assets remain the exclusive
          intellectual property of AliSamadii.LLC. This subscription does not
          include ownership, transfer, or distribution of source code. The
          client is subscribing to a continuous, professionally managed web
          presence — not a one-time deliverable. Our team handles all technical
          aspects so you can focus entirely on running your business without
          worrying about hosting, code, or infrastructure. If you are interested
          in a custom-built website with full source code ownership, please{" "}
          <a
            href="mailto:agency@alisamadii.com"
            className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            reach out
          </a>{" "}
          to discuss a separate development project tailored to your needs.
        </p>
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          <span className="font-bold">Ownership & IP.</span> All source code,
          design assets, and proprietary development work remain the exclusive
          intellectual property of AliSamadii.LLC. Subscribing gives you a
          professionally managed web presence — not ownership of the underlying
          codebase. If you need full source code ownership, contact us to
          discuss a custom development project.
        </p>
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          <span className="font-bold">Billing.</span> Subscriptions are billed
          monthly and renew automatically. You can cancel at any time —
          cancellation takes effect at the end of the current billing period. No
          refunds are issued for partial months.
        </p>
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          <span className="font-bold">Service & support.</span> All maintenance,
          updates, and minor copy changes are included. Requests are handled on
          a priority basis depending on your plan. For urgent issues or
          questions, reach us at{" "}
          <a
            href="mailto:agency@alisamadii.com"
            className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            agency@alisamadii.com
          </a>
          .
        </p>
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          <span className="font-bold">Privacy.</span> We collect only the
          information necessary to provide your services — name, email, billing
          details, and business information you share with us. We do not sell or
          share your data with third parties. All credentials and access
          information are stored securely and made available to you upon
          request.
        </p>
        <p className="text-muted-foreground text-[11px]">
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

const mdStyles = cn(
  "text-muted-foreground text-sm leading-relaxed",
  "[&_p]:mb-3 [&_p:last-child]:mb-0",
  "[&_strong]:text-foreground [&_strong]:font-semibold",
  "[&_ul]:my-2 [&_ul]:ml-1 [&_ul]:list-inside [&_ul]:list-disc [&_ul]:space-y-1",
  "[&_li]:text-muted-foreground [&_li]:marker:text-primary",
  "[&_a]:text-primary [&_a:hover]:text-primary/80 [&_a]:underline [&_a]:underline-offset-2"
);

const EachProduct = ({
  product,
}: {
  product: RouterOutputs["agency"]["getProducts"][number];
}) => {
  const trpc = useTRPC();
  const { data: isActive } = useQuery(
    trpc.agency.isActive.queryOptions({ productId: product.id })
  );
  const checkout = useMutation(trpc.agency.createCheckout.mutationOptions());

  return (
    <CardAgency.Card
      className={cn(
        "gap-4 p-5",
        isActive
          ? "border-green-500/40 bg-green-500/5 outline outline-2 outline-green-500/40"
          : ""
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h2 className="text-base leading-snug font-bold">
            {product.name ?? ""}
          </h2>
          {product.userId && (
            <Badge
              variant="secondary"
              className={cn(
                "w-fit",
                isActive && "border-green-500/30 bg-green-500/10 text-green-600"
              )}
            >
              Made especially for you
            </Badge>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-3xl font-black tracking-tighter tabular-nums">
            ${product.priceAmount ? formatPrice(product.priceAmount) : "N/A"}
            {product.recurringInterval && (
              <span className="text-muted-foreground text-sm font-normal tracking-normal">
                /{product.recurringInterval}
              </span>
            )}
          </p>
        </div>
      </div>

      {product.description && (
        <div className="text-muted-foreground text-sm whitespace-pre-line">
          {product.description}
        </div>
      )}

      <div className="mt-auto w-full">
        {isActive ? (
          <Button variant="outline" size="lg" className="mt-8 w-full" disabled>
            Subscribed
          </Button>
        ) : (
          <Button
            onClick={() =>
              checkout.mutate(
                {
                  productId: product.id ?? "",
                  successUrl: window.location.href,
                  extraPages: 0,
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
            className="mt-8 w-full"
            isLoading={checkout.isPending}
          >
            {product.recurringInterval === null
              ? `Purchase $${formatPrice(product.priceAmount ?? 0)}`
              : `Subscribe $${formatPrice(product.priceAmount ?? 0)}`}
          </Button>
        )}
      </div>
    </CardAgency.Card>
  );
};
