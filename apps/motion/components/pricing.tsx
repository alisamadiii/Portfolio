"use client";

import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import { useTheme } from "next-themes";

import { PageLoading } from "@workspace/ui/custom/page-loading";
import { urls } from "@workspace/ui/lib/company";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { useCheckout } from "@workspace/auth/hooks/use-payments";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { useIsPurchased } from "@/hooks/use-is-purchased";

export function Pricing() {
  const trpc = useTRPC();
  const product = useQuery(trpc.products.getByProject.queryOptions("MOTION"));
  const pathname = usePathname();
  const checkout = useCheckout();
  const { data: currentUser } = useCurrentUser();
  const { isPurchased } = useIsPurchased();
  const { resolvedTheme } = useTheme();

  const invertedTheme = resolvedTheme === "dark" ? "light" : "dark";
  const price = product.data?.priceAmount ? product.data.priceAmount / 100 : 0;

  return (
    <section
      className={cn(
        "bg-background relative mx-4 overflow-hidden rounded-[48px] px-4 py-24 md:mx-8",
        invertedTheme
      )}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="bg-primary/15 absolute -top-1/4 -right-1/4 h-[500px] w-[500px] rounded-full blur-[120px]" />
        <div className="bg-primary/10 absolute -bottom-1/4 -left-1/4 h-[400px] w-[400px] rounded-full blur-[120px]" />
      </div>

      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-64px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 mb-12 text-center"
      >
        <p className="text-muted-foreground text-sm font-medium tracking-widest uppercase">
          Pricing
        </p>
        <h2 className="text-foreground mt-3 text-2xl font-semibold md:text-3xl">
          One purchase. Lifetime access
          <br className="hidden md:block" /> to every animation.
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm">
          No subscriptions. No recurring fees. Pay once and get access to the
          full library — every component, every update, forever.
        </p>
      </motion.div>

      {/* Card with animated gradient border */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-64px" }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        className="relative z-10 mx-auto w-full max-w-lg overflow-hidden rounded-4xl p-px"
        style={{
          background:
            "conic-gradient(from var(--border-angle, 0deg) at 50% 50%, transparent 40%, var(--primary) 50%, var(--primary) 55%, transparent 70%)",
          animation: "border-rotate 4s linear infinite",
          willChange: "--border-angle",
        }}
      >
        <div className="bg-card relative overflow-hidden rounded-[calc(var(--radius-4xl)-1px)] p-8 md:p-10">
          {/* Price */}
          <div className="flex items-baseline gap-1">
            <span className="text-muted-foreground text-2xl font-medium">
              $
            </span>
            <span className="font-display text-foreground text-5xl font-semibold tracking-tight">
              {price}
            </span>
          </div>
          <p className="text-muted-foreground mt-1.5 text-xs font-medium tracking-wide uppercase">
            One-time payment
          </p>

          {/* CTA */}
          <div className="mt-8">
            {isPurchased ? (
              <button
                disabled
                className="bg-muted text-muted-foreground w-full rounded-xl py-4 text-sm font-medium"
              >
                Lifetime access
              </button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() =>
                  checkout.mutate({
                    productId: product.data?.id || "",
                    successUrl: urls.motion + pathname,
                  })
                }
                className="bg-primary text-primary-foreground w-full cursor-pointer rounded-xl py-4 text-sm font-semibold transition-colors"
              >
                Get Motion
              </motion.button>
            )}
          </div>

          {/* Divider */}
          <div className="border-border my-8 border-t" />

          {/* Features */}
          <p className="text-foreground mb-4 text-xs font-semibold tracking-wide uppercase">
            What&apos;s included
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature}
                className="text-muted-foreground flex items-center gap-2.5 text-sm"
              >
                <Check
                  className="text-primary size-3.5 shrink-0"
                  strokeWidth={2.5}
                />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {/* Loading overlay */}
          {currentUser && (
            <PageLoading
              active={checkout.isPending}
              name={checkout.isSuccess ? "Redirecting" : "Creating"}
            />
          )}
        </div>
      </motion.div>

      {/* Footer note */}
      <p className="text-muted-foreground relative z-10 mt-6 text-center text-xs">
        No credit card required to browse. Pay once, access forever.
      </p>
    </section>
  );
}

const features = [
  "All animations",
  "Unlimited use",
  "Lifetime access",
  "No recurring fees",
  "No hidden costs",
  "Source code included",
];
