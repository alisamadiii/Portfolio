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
  NextJS,
  Shadcn,
  TailwindCSS,
  TypeScript,
} from "@workspace/ui/icons";
import { cn } from "@workspace/ui/lib/utils";

import { useIsPurchased } from "@/hooks/use-is-purchased";

import { Pricing } from "@/components/pricing";

const poweredBy = [
  {
    name: "Next.js",
    url: "https://nextjs.org/",
    icon: NextJS,
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
];

export default function Home() {
  return (
    <main className="container space-y-12 pt-48">
      <BgPattern className="absolute inset-0 -z-10 h-full w-full" />
      {/* Header with text */}
      <div className="relative flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-black md:text-6xl">
          <span className="text-primary">Component & Animation</span> <br />{" "}
          Library for Modern Projects
        </h1>
        <p className="text-muted-foreground mx-auto max-w-2xl font-semibold md:text-2xl">
          Animated React components for production use. Source code only. No
          assets, demos, or design files included.
        </p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-4">
          {poweredBy.map((item) => (
            <div key={item.name}>
              <item.icon className="size-9" />
            </div>
          ))}
        </div>
        <p className="text-muted-foreground text-sm uppercase">Tech Stack</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
