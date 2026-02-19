"use client";

import { useState } from "react";
import Link from "next/link";
import { animations } from "@/animations/registry";
import { useTheme } from "next-themes";

import { BgPattern } from "@workspace/ui/components/bg-pattern";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  Empty,
  Motion,
  MotionPremium,
  React,
  Shadcn,
  TailwindCSS,
  TypeScript,
} from "@workspace/ui/icons";
import { Logo } from "@workspace/ui/icons/logo";
import { cn } from "@workspace/ui/lib/utils";

import { useIsPurchased } from "@/hooks/use-is-purchased";

import { Pricing } from "@/components/pricing";

const poweredBy = [
  {
    name: "React",
    url: "https://react.dev/",
    icon: React,
  },
  {
    name: "Tailwind CSS",
    url: "https://tailwindcss.com/",
    icon: TailwindCSS,
  },
  {
    name: "TypeScript",
    url: "https://www.typescriptlang.org/",
    icon: TypeScript,
  },
  {
    name: "Motion",
    url: "https://motion.dev/",
    icon: Motion,
  },
  {
    name: "Shadcn UI",
    url: "https://ui.shadcn.com/",
    icon: Shadcn,
  },
] as const;

export default function Home() {
  return (
    <main className="space-y-12">
      {/* Header with text */}
      <div className="relative flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="from-primary animate-text-intro text-primary-foreground mb-8 flex size-20 items-center justify-center rounded-xl bg-linear-to-tl to-blue-700">
          <Logo className="size-1/2" />
        </div>
        <h1 className="font-heading animate-text-intro text-4xl tracking-wide opacity-0 delay-200 md:text-6xl">
          <span className="text-primary">Component - Animation</span> <br />{" "}
          Library for Modern Projects
        </h1>
        <p className="animate-text-intro text-muted-foreground mx-auto max-w-2xl font-semibold opacity-0 delay-400 md:text-2xl">
          Animated React components for production use. Source code only. No
          assets, demos, or design files included.
        </p>
        <div className="mt-8 flex items-center gap-4">
          {poweredBy.map((item, index) => (
            <div
              key={item.name}
              className="bg-muted shadow-card animate-text-intro flex size-20 items-center justify-center rounded-xl opacity-0"
              style={{
                animationDelay: `${(index + 4) * 100}ms`,
              }}
            >
              <item.icon className="size-12" />
            </div>
          ))}
        </div>
      </div>

      <div className="container grid grid-flow-dense grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(animations)
          .sort((a) => (a[1].isPremium ? 1 : -1))
          .map(([key, animation]) => (
            <AnimationCard key={key} animationKey={key} animation={animation} />
          ))}
      </div>

      <Pricing />
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
