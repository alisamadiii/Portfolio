"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Spinner } from "@workspace/ui/components/spinner";

import { useTRPC } from "@workspace/trpc/client";

import { Wizard } from "./wizard";

export default function AgencyCreatePage() {
  const searchParams = useSearchParams();
  const productId = searchParams.get("productId");

  const trpc = useTRPC();
  const { data: product, isLoading } = useQuery(
    trpc.products.getProductById.queryOptions(productId ?? "", {
      enabled: !!productId,
    })
  );

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <Wizard
      productId={productId}
      product={
        product
          ? {
              name: product.name ?? "",
              email: product.email ?? "",
              userId: product.userId ?? "",
              services: product.services ?? [],
              priceAmount: product.priceAmount ?? 0,
            }
          : null
      }
    />
  );
}
