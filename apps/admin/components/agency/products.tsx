import React from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowRight, Code, Copy, Package } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

// ─── JSON Viewer Dialog ──────────────────────────────────────────
const JsonViewer = ({ data, label }: { data: unknown; label: string }) => {
  const json = JSON.stringify(data, null, 2);

  const highlighted = json.replace(
    /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")\s*:|("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")|(true|false)|(null)|(-?\d+\.?\d*)/g,
    (
      match,
      key: string,
      string: string,
      bool: string,
      nil: string,
      num: string
    ) => {
      if (key)
        return `<span class="text-violet-600 dark:text-violet-400">${key}</span>:`;
      if (string)
        return `<span class="text-emerald-600 dark:text-emerald-400">${string}</span>`;
      if (bool)
        return `<span class="text-amber-600 dark:text-amber-400">${bool}</span>`;
      if (nil)
        return `<span class="text-zinc-400 dark:text-zinc-500 italic">${nil}</span>`;
      if (num)
        return `<span class="text-sky-600 dark:text-sky-400">${num}</span>`;
      return match;
    }
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
          <Code className="size-3" />
          JSON
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="absolute top-2 right-2 z-10 h-7 gap-1.5 text-xs"
            onClick={() => {
              navigator.clipboard.writeText(json);
              toast.success("JSON copied");
            }}
          >
            <Copy className="size-3" />
            Copy
          </Button>
          <pre
            className="bg-muted max-h-[60vh] overflow-auto rounded-lg p-4 text-[13px] leading-relaxed break-all whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Checkout Link Button ────────────────────────────────────────
const CreateCheckoutLink = ({
  productId,
  isArchived,
}: {
  productId: string;
  isArchived: boolean;
}) => {
  const trpc = useTRPC();
  const createCheckout = useMutation(
    trpc.admin.agency.products.createCheckout.mutationOptions()
  );

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        createCheckout.mutate(
          { productId },
          {
            onSuccess: (data) => {
              navigator.clipboard.writeText(data.url);
              toast.success("Checkout link copied");
            },
            onError: (error) => {
              toast.error(error.message);
            },
          }
        );
      }}
      disabled={isArchived}
      isLoading={createCheckout.isPending}
    >
      Checkout Link
    </Button>
  );
};

// ─── Main Component ──────────────────────────────────────────────
export const AgencyProducts = () => {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(
    trpc.admin.agency.products.getAllProducts.queryOptions()
  );

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-52 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-20">
        <Package className="size-8 opacity-40" />
        <p className="text-sm">No products found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((product) => {
        return (
          <Card
            key={product.id}
            className={cn("flex flex-col transition-shadow hover:shadow-md")}
          >
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle className="truncate text-2xl">
                  {product.name}
                </CardTitle>
                {product.email && (
                  <p className="text-muted-foreground truncate text-xs">
                    {product.email}
                  </p>
                )}
                <p className="text-muted-foreground mt-2 text-xs">
                  {format(product.createdAt, "MMM d, yyyy")}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge
                  variant="outline"
                  className="text-muted-foreground shrink-0 text-[11px]"
                >
                  {product.recurringInterval ?? "One-time"}
                </Badge>
                <Badge
                  className="shrink-0 text-[11px]"
                  variant={product.isArchived ? "destructive" : "default"}
                >
                  {product.isArchived ? "Archived" : "Active"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-3">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold tabular-nums">
                  ${(product.priceAmount / 100).toFixed(2)}
                </span>
                {product.recurringInterval && (
                  <span className="text-muted-foreground text-sm">
                    /{product.recurringInterval}
                  </span>
                )}
              </div>

              {product.scope && (
                <div className="flex flex-wrap gap-2">
                  {JSON.parse(product.scope).map((item: string) => (
                    <Badge
                      key={item}
                      variant="outline"
                      className="text-muted-foreground shrink-0 text-[11px]"
                    >
                      {item}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-wrap gap-2 border-t pt-4">
              <Button size="sm" asChild>
                <Link href={`/agency/${product.userId}`}>
                  View Details
                  <ArrowRight className="size-3" />
                </Link>
              </Button>
              <CreateCheckoutLink
                productId={product.id}
                isArchived={product.isArchived}
              />
              <JsonViewer data={product} label={`${product.name} — Raw JSON`} />
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};
