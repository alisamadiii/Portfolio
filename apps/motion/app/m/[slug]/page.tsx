"use client";

import { memo, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { animations } from "@/animations/registry";
import { useQuery } from "@tanstack/react-query";
import { ReactLenis, useLenis } from "lenis/react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
import { useHotkeys } from "react-hotkeys-hook";

import { Button, buttonVariants } from "@workspace/ui/components/button";
import { Kbd, KbdGroup } from "@workspace/ui/components/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import {
  Box2Search,
  Code,
  Keyboard2,
  Refresh,
  SideProfileSparkle,
} from "@workspace/ui/icons";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import { useSettings } from "@/hooks/settings";

import { SourceCode } from "@/components/animation-settings/source-code";
import { LibrariesUsedDialog } from "@/components/libraries-used";
import { ReportBugLink } from "@/components/report-bug-link";
import { ShortcutsDialog } from "@/components/shortcuts-dialog";
import { UseWithAI } from "@/components/use-with-ai";
import { UserProfile } from "@/components/user-profile";

const animationKeys = Object.keys(animations);

export default function ComponentPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [isToggleElements, setIsToggleElements] = useState(false);
  const [isToggleSettings, setIsToggleSettings] = useState(false);
  const { theme, setTheme } = useTheme();
  const { containerScale } = useSettings();

  const isMobile = useIsMobile;

  const [isRefreshing, setIsRefreshing] = useState(0);
  const refresh = () => setIsRefreshing((prev) => prev + 1);

  const { slug } = useParams();
  const router = useRouter();
  const animation = animations[slug as keyof typeof animations];

  // Prev/next navigation
  const { prevSlug, nextSlug, prevName, nextName } = useMemo(() => {
    const idx = animationKeys.indexOf(slug as string);
    const prev = idx > 0 ? idx - 1 : animationKeys.length - 1;
    const next = idx < animationKeys.length - 1 ? idx + 1 : 0;
    return {
      prevSlug: animationKeys[prev],
      nextSlug: animationKeys[next],
      prevName:
        animations[animationKeys[prev] as keyof typeof animations]?.name,
      nextName:
        animations[animationKeys[next] as keyof typeof animations]?.name,
    };
  }, [slug]);

  useHotkeys("r", () => refresh(), [refresh]);
  useHotkeys("v", () => setIsOpen(!isOpen), [isOpen]);
  useHotkeys("b", () => setIsToggleElements(!isToggleElements), [
    isToggleElements,
  ]);
  useHotkeys("s", () => setIsToggleSettings(!isToggleSettings), [
    isToggleSettings,
  ]);
  useHotkeys("d", () => setTheme(theme === "dark" ? "light" : "dark"), [theme]);
  useHotkeys("[", () => router.push(`/m/${prevSlug}`), [prevSlug]);
  useHotkeys("]", () => router.push(`/m/${nextSlug}`), [nextSlug]);

  const trpc = useTRPC();
  useQuery(
    trpc.sources.getFiles.queryOptions(
      { sourceId: animation?.id ?? "" },
      { enabled: !!animation?.id }
    )
  );

  const lenis = useLenis((lenis) => {
    // called every scroll
    console.log(lenis);
  });

  if (!animation) {
    return <div>Animation not found</div>;
  }

  const noPadding =
    slug === "image-shrink-on-scroll" || slug === "gap-change-on-scroll";

  return (
    <>
      {/* <ReactLenis root /> */}
      <motion.div
        initial={{ maxWidth: "100%" }}
        animate={{ maxWidth: isOpen && !isMobile ? "80%" : "100%" }}
        transition={{
          duration: 0.5,
          type: "spring",
          bounce: 0.3,
        }}
        className={cn(
          "flex min-h-screen w-full origin-top flex-col items-center-safe justify-center-safe px-8 py-24 md:py-8",
          noPadding && "p-0!",
          slug === "badge-claiming" && "bg-muted"
        )}
        style={{
          transform: `scale(${containerScale})`,
          transition: "transform 0.4s cubic-bezier(0.785, 0.135, 0.15, 0.86)",
        }}
        id="motion-container"
      >
        <ComponentView key={isRefreshing} />
      </motion.div>

      <div
        className={cn(
          "fixed top-0 right-0 left-0 z-100 flex items-start justify-between p-4",
          isToggleElements && "hidden"
        )}
      >
        <div className="flex items-center gap-2">
          <UserProfile />
        </div>

        <div className="relative z-10 flex flex-row-reverse flex-wrap gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon-lg" onClick={() => setIsOpen(!isOpen)}>
                  <Code className="size-5.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <KbdGroup>
                  <Kbd>v</Kbd> <span>Code</span>
                </KbdGroup>
              </TooltipContent>
            </Tooltip>
            {/* <Tooltip>
              <TooltipTrigger>
                <UseWithAI>
                  <Button size="icon-lg" variant="outline">
                    <Sparkles className="size-5.5" />
                  </Button>
                </UseWithAI>
              </TooltipTrigger>
              <TooltipContent>Use with AI</TooltipContent>
            </Tooltip> */}
            <Tooltip>
              <TooltipTrigger>
                <LibrariesUsedDialog>
                  <Button size="icon-lg" variant="outline">
                    <Box2Search className="size-5.5" />
                  </Button>
                </LibrariesUsedDialog>
              </TooltipTrigger>
              <TooltipContent>Libraries Used</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon-lg" variant="outline" onClick={refresh}>
                  <Refresh
                    key={isRefreshing}
                    className="animate-rotate size-5.5"
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <KbdGroup>
                  <Kbd>r</Kbd> <span>Refresh</span>
                </KbdGroup>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <ShortcutsDialog>
                  <Button size="icon-lg" variant="outline">
                    <Keyboard2 className="size-5.5" />
                  </Button>
                </ShortcutsDialog>
              </TooltipTrigger>
              <TooltipContent>
                <KbdGroup>
                  <Kbd>k</Kbd> <span>Keyboard Shortcuts</span>
                </KbdGroup>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ReportBugLink animationName={animation.name} />
              </TooltipTrigger>
              <TooltipContent>Report a bug</TooltipContent>
            </Tooltip>
            {animation.from && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={animation.from}
                    target="_blank"
                    className={buttonVariants({
                      variant: "outline",
                      size: "icon-lg",
                    })}
                  >
                    <SideProfileSparkle className="size-5.5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Visit the source</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>

        <AnimatePresence>{isOpen && <SourceCode />}</AnimatePresence>
      </div>

      {/* Prev/Next navigation */}
      <div
        className={cn(
          "bg-background/80 fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border px-1 py-1 backdrop-blur-xl",
          isToggleElements && "hidden"
        )}
      >
        <Link
          href={`/m/${prevSlug}`}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
        >
          <ChevronLeft className="size-3.5" />
          <span className="hidden max-w-[100px] truncate sm:inline">
            {prevName}
          </span>
        </Link>
        <div className="bg-border h-4 w-px" />
        <Link
          href={`/m/${nextSlug}`}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
        >
          <span className="hidden max-w-[100px] truncate sm:inline">
            {nextName}
          </span>
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
    </>
  );
}

const ComponentView = memo(() => {
  const { slug } = useParams();
  const animation = animations[slug as keyof typeof animations];

  return <animation.component />;
});
ComponentView.displayName = "ComponentView";
