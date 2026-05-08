"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ChevronRight, ShoppingCart, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { CardAgency } from "@workspace/ui/agency/card-agency";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { RequestDialog } from "@workspace/ui/custom/request-dialog";
import { cn, formatPrice } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { RouterOutputs } from "@workspace/trpc/routers/_app";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

type Product = RouterOutputs["products"]["list"][number];
type ProductStatus = "subscribed" | "purchased" | null;

type CartItem = {
  id: string;
  name: string;
  priceAmount: number;
  isRecurring: boolean;
  recurringInterval: string | null;
};

export default function PortalPage() {
  const trpc = useTRPC();
  const { data: user } = useCurrentUser();
  const products = useQuery(trpc.products.list.queryOptions());
  const customerState = useQuery(
    trpc.payments.getCustomerState.queryOptions(undefined, {
      enabled: !!user,
    })
  );

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const cartTotal = cart.reduce((sum, item) => sum + item.priceAmount, 0);

  const isInCart = useCallback(
    (productId: string) => cart.some((item) => item.id === productId),
    [cart]
  );

  const addToCart = useCallback(
    (product: Product) => {
      if (cart.some((item) => item.id === product.id)) {
        toast.info("Already in cart");
        return;
      }
      setCart((prev) => [
        ...prev,
        {
          id: product.id,
          name: product.name ?? "",
          priceAmount: product.priceAmount ?? 0,
          isRecurring: product.isRecurring,
          recurringInterval: product.recurringInterval,
        },
      ]);
      toast.success(`${product.name} added to cart`);
    },
    [cart]
  );

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => {
      const next = prev.filter((item) => item.id !== productId);
      if (next.length === 0) setCartOpen(false);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCartOpen(false);
  }, []);

  const checkout = useMutation(trpc.payments.createCheckout.mutationOptions());

  const allProducts = (products.data ?? []).filter((p) => !p.isArchived);

  const productsByProject = useMemo(() => {
    const groups = new Map<string, Product[]>();
    allProducts.forEach((p) => {
      const meta = p.metadata as { project?: string; userId?: string };
      const key = meta?.project ?? "General";
      const list = groups.get(key) ?? [];
      list.push(p);
      groups.set(key, list);
    });
    return groups;
  }, [allProducts]);

  const getProductStatus = useMemo(() => {
    const subscribedProductIds = customerState.data?.subscribedProductIds ?? [];
    const paidOrders = customerState.data?.paidOrders ?? [];

    return (product: Product): ProductStatus => {
      if (subscribedProductIds.includes(product.id)) {
        return "subscribed";
      }

      const hasPaidOrder = paidOrders.some(
        (o) => o.productId === product.id
      );

      if (hasPaidOrder) return "purchased";

      return null;
    };
  }, [customerState.data]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Product details</h1>
        <RequestDialog>
          <Button>Contact Support</Button>
        </RequestDialog>
      </div>

      {products.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-14 w-full rounded-md" />
        </div>
      ) : (
        <div className="border-border overflow-hidden rounded-lg border">
          {/* Table header */}
          <div className="bg-muted/50 grid grid-cols-[40px_1fr_80px] items-center border-b px-4 py-3">
            <span />
            <span className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Project
            </span>
            <span className="text-muted-foreground text-right text-xs font-semibold tracking-widest uppercase">
              Products
            </span>
          </div>

          <Accordion
            type="multiple"
            defaultValue={
              productsByProject.size > 0
                ? [Array.from(productsByProject.keys())[0]]
                : []
            }
          >
            {Array.from(productsByProject.entries()).map(
              ([project, projectProducts], idx) => (
                <AccordionItem
                  key={project}
                  value={project}
                  className={cn(
                    "border-none",
                    idx < productsByProject.size - 1 && "border-border border-b"
                  )}
                >
                  <AccordionTrigger className="grid grid-cols-[40px_1fr_80px] items-center px-4 py-3 hover:no-underline [&[data-state=open]_[data-arrow]]:rotate-90 [&>svg:last-child]:hidden">
                    <ChevronRight data-arrow="" className="text-muted-foreground size-4 transition-transform duration-200" />
                    <span className="text-sm font-medium">{project}</span>
                    <span className="text-muted-foreground text-right text-sm tabular-nums">
                      {projectProducts.length}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="bg-muted/30 px-4">
                    <div className="grid grid-cols-1 gap-4 py-4 lg:grid-cols-2">
                      {projectProducts.map((product) => (
                        <EachProduct
                          key={product.id}
                          product={product}
                          status={getProductStatus(product)}
                          inCart={isInCart(product.id)}
                          onAddToCart={addToCart}
                          onRemoveFromCart={removeFromCart}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            )}
          </Accordion>
        </div>
      )}

      {/* Custom product request */}
      <div className="space-y-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Custom Product
        </h2>
        <CardAgency.Card className="gap-4 p-5">
          <div className="flex flex-1 flex-col justify-between gap-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-base leading-snug font-bold">
                Custom Product
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Need something specific? Request a unique plan tailored to your
                business — custom services, pricing, and scope.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <RequestDialog defaultSubject="Request a Custom Product">
                <p className="text-primary cursor-pointer text-sm font-medium underline underline-offset-4">
                  Request a custom or unique product &rarr;
                </p>
              </RequestDialog>
              <a
                href="https://alisamadii.com/blog/services"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4 transition-colors"
              >
                Learn more about our services &rarr;
              </a>
            </div>
          </div>
        </CardAgency.Card>
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

      {/* Floating cart button */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-40"
          >
            <Button
              size="lg"
              onClick={() => setCartOpen(true)}
              className="gap-2 rounded-full shadow-lg"
            >
              <ShoppingCart className="size-4" />
              Cart ({cart.length})
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart sheet */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="right" className="flex flex-col">
          <SheetHeader>
            <SheetTitle>Your Cart</SheetTitle>
            <SheetDescription>
              {cart.length === 0
                ? "No items yet"
                : `${cart.length} ${cart.length === 1 ? "item" : "items"}`}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-3 overflow-y-auto py-4">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-muted-foreground text-xs">
                    ${formatPrice(item.priceAmount)}
                    {item.recurringInterval && `/${item.recurringInterval}`}
                  </p>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-muted-foreground hover:text-destructive shrink-0 transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}

            {cart.length === 0 && (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Your cart is empty
              </p>
            )}
          </div>

          {cart.length > 0 && (
            <SheetFooter className="border-t pt-4">
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-lg font-bold tabular-nums">
                    ${formatPrice(cartTotal)}
                  </span>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  isLoading={checkout.isPending}
                  onClick={() =>
                    checkout.mutate(
                      {
                        productId: cart[0]?.id ?? "",
                        successUrl: window.location.href,
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
                >
                  Checkout ({cart.length} {cart.length === 1 ? "item" : "items"})
                </Button>
                <button
                  onClick={clearCart}
                  className="text-muted-foreground hover:text-foreground w-full text-center text-xs underline underline-offset-2 transition-colors"
                >
                  Clear cart
                </button>
              </div>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

const EachProduct = ({
  product,
  status,
  inCart,
  onAddToCart,
  onRemoveFromCart,
}: {
  product: Product;
  status: ProductStatus;
  inCart: boolean;
  onAddToCart: (product: Product) => void;
  onRemoveFromCart: (productId: string) => void;
}) => {
  const trpc = useTRPC();
  const metadata = product.metadata as {
    userId?: string;
    project?: string;
  } | null;
  const isCustom = !!metadata?.userId;
  const isActive = status !== null;
  const checkout = useMutation(trpc.payments.createCheckout.mutationOptions());

  return (
    <CardAgency.Card
      className={cn(
        "gap-4 p-5",
        isActive
          ? "border-green-500/40 bg-green-500/5 outline outline-2 outline-green-500/40"
          : inCart
            ? "border-primary/40 bg-primary/5 outline outline-2 outline-primary/40"
            : ""
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h2 className="text-base leading-snug font-bold">
            {product.name ?? ""}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {isActive && (
              <Badge
                variant="secondary"
                className="w-fit gap-1 border-green-500/30 bg-green-500/10 text-green-600"
              >
                <Check className="size-3" />
                {status === "subscribed" ? "Subscribed" : "Purchased"}
              </Badge>
            )}
            {inCart && (
              <Badge variant="secondary" className="w-fit gap-1">
                <ShoppingCart className="size-3" />
                In cart
              </Badge>
            )}
            {isCustom && (
              <Badge
                variant="secondary"
                className={cn(
                  "w-fit",
                  isActive &&
                    "border-green-500/30 bg-green-500/10 text-green-600"
                )}
              >
                Made especially for you
              </Badge>
            )}
          </div>
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
            {status === "subscribed" ? "Subscribed" : "Purchased"}
          </Button>
        ) : (
          <div className="mt-8 flex w-full gap-2">
            <Button
              variant={inCart ? "secondary" : "outline"}
              size="lg"
              className="flex-1"
              onClick={() =>
                inCart
                  ? onRemoveFromCart(product.id)
                  : onAddToCart(product)
              }
            >
              {inCart ? (
                <>
                  <X className="mr-1 size-4" />
                  Remove
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-1 size-4" />
                  Add to Cart
                </>
              )}
            </Button>
            <Button
              onClick={() =>
                checkout.mutate(
                  {
                    productId: product.id,
                    successUrl: window.location.href,
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
              className="flex-1"
              isLoading={checkout.isPending}
            >
              {product.recurringInterval === null
                ? `Buy $${formatPrice(product.priceAmount ?? 0)}`
                : `Subscribe $${formatPrice(product.priceAmount ?? 0)}`}
            </Button>
          </div>
        )}
      </div>
    </CardAgency.Card>
  );
};
