"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { animations } from "@/animations/registry";
import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useTheme } from "next-themes";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { Empty, MotionPremium } from "@workspace/ui/icons";
import { Logo } from "@workspace/ui/icons/logo";
import { cn } from "@workspace/ui/lib/utils";

import { useIsPurchased } from "@/hooks/use-is-purchased";

import { Pricing } from "@/components/pricing";

const HeroAnimation = animations["stripe-grid"].component;

export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const { resolvedTheme } = useTheme();
  const invertedTheme = resolvedTheme === "dark" ? "light" : "dark";

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <main
      className={cn(
        "space-y-12 transition-opacity duration-300",
        hydrated ? "opacity-100" : "opacity-0"
      )}
    >
      {/* Hero */}
      <section className="px-4 pt-8 md:pt-12">
        <div className={cn("bg-background relative mx-auto flex h-[600px] w-full max-w-[1400px] flex-col overflow-hidden rounded-[48px]", invertedTheme)}>
          {/* Ambient glow */}
          <div className="pointer-events-none absolute inset-0 z-0">
            <div className="bg-primary/15 absolute -top-1/4 -left-1/4 h-[600px] w-[600px] rounded-full blur-[120px]" />
            <div className="bg-primary/10 absolute -right-1/4 -bottom-1/4 h-[500px] w-[500px] rounded-full blur-[120px]" />
          </div>

          {/* Content: text left, animation right */}
          <div className="relative z-10 flex h-full flex-col md:flex-row">
            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-1 flex-col justify-center px-8 pt-12 md:px-16 md:pt-0"
            >
              <h1 className="font-display text-foreground text-[36px] leading-[1.1] font-medium tracking-tight md:text-[52px]">
                Beautiful animations,
                <br />
                ready to ship
              </h1>
              <p className="text-muted-foreground mt-4 max-w-md text-[14px] leading-relaxed md:text-[15px]">
                Production-grade animated React components you can copy into
                your projects. Built with Motion, Tailwind, and TypeScript — no
                wrappers, no dependencies, just clean source code.
              </p>
              <div className="mt-8 flex items-center gap-3">
                <motion.a
                  href="#components"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-primary text-primary-foreground rounded-full px-6 py-3 text-sm font-semibold transition-colors"
                >
                  Browse Components
                </motion.a>
                <motion.a
                  href="#pricing"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.98 }}
                  className="border-border text-muted-foreground hover:text-foreground hover:border-border/80 rounded-full border px-6 py-3 text-sm font-medium transition-colors"
                >
                  View Pricing
                </motion.a>
              </div>
            </motion.div>

            {/* Animation showcase */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              className="relative hidden flex-1 items-center justify-center overflow-hidden md:flex"
            >
              <div className="relative h-full w-full scale-[0.85]">
                <HeroAnimation />
              </div>
            </motion.div>
          </div>

          {/* Floating bottom navbar */}
          <motion.nav
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
            className="border-border bg-card/80 absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full border px-1.5 py-1.5 backdrop-blur-2xl"
          >
            <a
              href="#"
              className="bg-muted text-foreground flex h-9 w-9 items-center justify-center rounded-full"
            >
              <Logo className="size-4" />
            </a>
            <a
              href="#components"
              className="text-muted-foreground hover:text-foreground px-4 py-2 text-[12px] font-semibold transition-colors"
            >
              Components
            </a>
            <a
              href="#pricing"
              className="text-muted-foreground hover:text-foreground px-4 py-2 text-[12px] font-semibold transition-colors"
            >
              Pricing
            </a>
            <a
              href="#components"
              className="border-border bg-muted text-foreground hover:bg-accent flex items-center gap-1 rounded-full border px-5 py-2 text-[12px] font-semibold transition-all"
            >
              Get Started
              <ChevronRight className="size-3.5" />
            </a>
          </motion.nav>
        </div>
      </section>

      {/* Animation cards grid */}
      <div
        id="components"
        className="container grid scroll-mt-8 grid-flow-dense grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        {Object.entries(animations)
          .sort((a) => (a[1].isPremium ? 1 : -1))
          .map(([key, animation]) => (
            <AnimationCard key={key} animationKey={key} animation={animation} />
          ))}
      </div>

      <div id="pricing" className="scroll-mt-8">
        <Pricing />
      </div>
    </main>
  );
}

const AnimationCard = ({
  animationKey,
  animation,
}: {
  animationKey: string;
  animation: (typeof animations)[keyof typeof animations];
}) => {
  const { resolvedTheme } = useTheme();
  const [error, setError] = useState<string | null>(null);

  const { isPurchased } = useIsPurchased();

  return (
    <Link
      href={`/m/${animationKey}`}
      className={cn(
        "group shadow-card bg-background aspect-4/3 basis-[400px] overflow-hidden rounded-3xl p-0 duration-200 active:scale-95 dark:border",
        "first-of-type:lg:col-span-2 first-of-type:lg:row-span-2",
        "nth-[5n]:lg:col-span-2 nth-[5n]:lg:row-span-2"
      )}
      style={{
        perspective: "1000px",
      }}
    >
      {error || !animation.image ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Empty className="text-muted-foreground size-8" />
        </div>
      ) : (
        <img
          src={
            resolvedTheme === "dark"
              ? animation.darkImage || animation.image
              : animation.image
          }
          alt={animation.name}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setError("Failed to load image")}
        />
      )}
      {animation.isPremium && !isPurchased && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <MotionPremium className="absolute top-2 right-2 size-8 text-yellow-500" />
            </TooltipTrigger>
            <TooltipContent>Only available to premium users</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </Link>
  );
};
