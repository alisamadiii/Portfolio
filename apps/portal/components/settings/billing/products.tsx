"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Check, CircleCheck } from "lucide-react";

import type { ProjectType } from "@workspace/drizzle/schema";
import { Button, buttonVariants } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { Spinner } from "@workspace/ui/components/spinner";
import { PageLoading } from "@workspace/ui/custom/page-loading";
import { urls } from "@workspace/ui/lib/company";
import { design } from "@workspace/ui/lib/design";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import {
  useCheckout,
  useIsUserHaveAccess,
  useSwitchPlan,
} from "@workspace/auth/hooks/use-payments";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

type Product = RouterOutputs["payments"]["getProducts"][number];

function getProjectFromMetadata(
  metadata: unknown
): Lowercase<ProjectType> | null {
  const project = (metadata as { project?: string })?.project;
  if (!project) return null;
  return project.toLowerCase() as Lowercase<ProjectType>;
}

function getProjectColor(project: Lowercase<ProjectType> | null): string {
  if (!project) return design.default.color;
  if (project in design) {
    return (design as Record<string, { color: string }>)[project].color;
  }
  return design.default.color;
}

export function BillingProducts() {
  const trpc = useTRPC();
  const products = useQuery(trpc.payments.getProducts.queryOptions());

  const filtered = useMemo(
    () => products.data?.filter((p) => !p.isArchived) ?? [],
    [products.data]
  );

  return (
    <div className="space-y-4">
      <h3 className="text-muted-foreground text-sm">Products</h3>

      {products.isPending ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
          <p className="text-muted-foreground text-sm">
            No products available
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((product) => (
            <EachProduct key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

function EachProduct({ product }: { product: Product }) {
  const checkout = useCheckout();
  const switchPlan = useSwitchPlan();
  const { data: currentUser } = useCurrentUser();
  const { currentProductId, currentSubscriptionId } = useIsUserHaveAccess();

  const project = getProjectFromMetadata(product.metadata);
  const color = getProjectColor(project);
  const siteUrl = project ? urls[project] : null;

  const features = useMemo(
    () =>
      product.description
        ?.split("\n")
        .filter((line) => line.trim().startsWith("-"))
        .map((line) => line.trim().substring(1).trim()) ?? [],
    [product.description]
  );

  const summary = useMemo(
    () =>
      product.description
        ?.split("\n")
        .find((line) => !line.trim().startsWith("-")) ?? "",
    [product.description]
  );

  const isCurrentPlan = currentProductId === product.id;

  return (
    <div
      className="flex flex-col rounded-xl p-5 text-white shadow-md"
      style={{
        backgroundColor: color,
        ...(isCurrentPlan
          ? { outline: "3px solid #22c55e", outlineOffset: "-3px" }
          : {}),
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            {isCurrentPlan && (
              <span className="flex size-5 items-center justify-center rounded-full bg-green-500">
                <Check className="size-3 text-white" strokeWidth={3} />
              </span>
            )}
            <p className="text-xs tracking-[0.2em] text-white/70 uppercase">
              {project?.toUpperCase() ?? "Product"}
              {isCurrentPlan && (
                <span className="ml-1 text-green-300">(purchased)</span>
              )}
            </p>
          </div>
          <h4 className="text-lg font-semibold">
            {product.name
              .replace(/month/i, "")
              .replace(/year/i, "")
              .trim()}
          </h4>
        </div>
        <p className="text-2xl font-bold">
          ${product.priceAmount / 100}
          <span className="text-sm font-normal text-white/70">
            /{product.recurringInterval}
          </span>
        </p>
      </div>

      {summary && (
        <p className="mt-2 text-sm text-white/80">{summary}</p>
      )}

      {features.length > 0 && (
        <>
          <Separator className="my-3 bg-white/20" />
          <ul className="space-y-1.5 text-sm">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/90" />
                <span className="text-white/90">{feature}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-4">
        {siteUrl && (
          <Link
            href={siteUrl}
            target="_blank"
            className={buttonVariants({
              variant: "outline",
              className: "w-full text-xs text-black",
            })}
          >
            Visit Website
          </Link>
        )}

        {isCurrentPlan ? (
          <Button className="w-full" disabled>
            <CircleCheck className="text-green-300" />
            Current Plan
          </Button>
        ) : currentProductId ? (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() =>
              switchPlan.mutate({
                subscriptionId: currentSubscriptionId ?? "",
                toProductId: product.id,
              })
            }
          >
            Switch to this plan
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() =>
              checkout.mutate({
                productId: product.id,
                successUrl: siteUrl || "/",
              })
            }
          >
            {product.trialIntervalCount && product.trialIntervalCount > 0
              ? `Start ${product.trialIntervalCount} ${product.trialInterval} free trial`
              : "Get Started"}
          </Button>
        )}
      </div>

      {currentUser && (
        <PageLoading
          active={checkout.isPending}
          name={checkout.isSuccess ? "Redirecting" : "Creating"}
        />
      )}
      <PageLoading active={switchPlan.isPending} name="Switching" />
    </div>
  );
}
