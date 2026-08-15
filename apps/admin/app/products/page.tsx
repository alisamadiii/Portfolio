"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Braces } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { design } from "@workspace/ui/lib/design";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { Content } from "@/components/content-admin";
import { FormattedJSON } from "@/components/json-format";
import { StatusBadge } from "@/components/status-badge";

type Product = RouterOutputs["products"]["list"][number];

function getProjectColor(metadata: unknown): string {
  const project = (metadata as { project?: string })?.project;
  if (project === "MOTION") return design.motion.color;
  if (project === "AGENCY") return design.agency.color;
  return design.default.color;
}

const formatUSD = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);

export default function AdminProductsPage() {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(trpc.products.list.queryOptions());

  return (
    <Content>
      <div className="mb-5 flex items-baseline gap-2.5">
        <h1 className="text-xl font-semibold tracking-tight">Products</h1>
        <span className="text-num text-muted-foreground text-xs">
          {data?.length ?? ""}
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : !data?.length ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          No products.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </Content>
  );
}

const ProductCard = ({ product }: { product: Product }) => (
  <div className="bg-card flex flex-col gap-3 rounded-2xl border p-5">
    <div className="flex items-center gap-2">
      <span
        className="block size-3 shrink-0 rounded-full"
        style={{ backgroundColor: getProjectColor(product.metadata) }}
      />
      <span className="truncate text-sm font-medium">{product.name}</span>
      <Dialog>
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground ml-auto size-7"
            />
          }
        >
          <Braces className="size-4" />
        </DialogTrigger>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
          </DialogHeader>
          <FormattedJSON data={product} />
        </DialogContent>
      </Dialog>
    </div>

    <div className="flex items-baseline gap-1">
      <span className="text-num text-3xl font-semibold tracking-tight">
        {formatUSD(product.priceAmount)}
      </span>
      {product.isRecurring && (
        <span className="text-muted-foreground text-sm">/mo</span>
      )}
    </div>

    <div className="mt-auto flex items-center justify-between">
      <StatusBadge tone={product.isRecurring ? "teal" : "gray"}>
        {product.isRecurring ? "Recurring" : "One-time"}
      </StatusBadge>
      {product.createdAt && (
        <span className="text-num text-muted-foreground text-xs">
          {format(product.createdAt, "MMM d, yyyy")}
        </span>
      )}
    </div>
  </div>
);
