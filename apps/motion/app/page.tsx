"use client";

import Link from "next/link";
import { useTheme } from "next-themes";

import { BgPattern } from "@workspace/ui/components/bg-pattern";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { MotionPremium } from "@workspace/ui/icons";

import { animations } from "@/lib/animations";

import { Pricing } from "@/components/pricing";

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
        <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
          Hey there! 👋 Check out this collection of polished React components
          with animations, key points, and video demos to enhance your projects.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(animations).map(([key, animation]) => (
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
  return (
    <Link
      href={`/m/${animationKey}`}
      className="group shadow-card aspect-4/3 basis-[400px] overflow-hidden rounded-3xl p-0 duration-200 first-of-type:col-span-2 active:scale-95 dark:border"
      style={{
        perspective: "1000px",
      }}
    >
      <img
        src={
          resolvedTheme === "dark"
            ? animation.darkImage || animation.image
            : animation.image
        }
        alt={animation.name}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {animation.isPremium && (
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
