"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
import { useHotkeys } from "react-hotkeys-hook";

import { Button } from "@workspace/ui/components/button";
import { Kbd, KbdGroup } from "@workspace/ui/components/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { Code, Refresh, SquareCommand } from "@workspace/ui/icons";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import { animations } from "@/lib/animations";

import { SourceCode } from "@/components/animation-settings/source-code";
import { ShortcutsDialog } from "@/components/shortcuts-dialog";
import { UserProfile } from "@/components/user-profile";

export default function ComponentPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [isToggleElements, setIsToggleElements] = useState(false);
  const { theme, setTheme } = useTheme();

  const [isRefreshing, setIsRefreshing] = useState(0);
  const refresh = () => setIsRefreshing((prev) => prev + 1);

  const { slug } = useParams();
  const animation = animations[slug as keyof typeof animations];

  useHotkeys("r", () => refresh(), [refresh]);
  useHotkeys("v", () => setIsOpen(!isOpen), [isOpen]);
  useHotkeys("s", () => setIsToggleElements(!isToggleElements), [
    isToggleElements,
  ]);
  useHotkeys("d", () => setTheme(theme === "dark" ? "light" : "dark"), [theme]);

  const trpc = useTRPC();
  useQuery(
    trpc.motion.getFiles.queryOptions(
      { sourceId: animation.id },
      {
        enabled: !!animation.id,
      }
    )
  );

  if (!animation) {
    return <div>Animation not found</div>;
  }

  return (
    <>
      <motion.div
        initial={{ maxWidth: "100%" }}
        animate={{ maxWidth: isOpen ? "80%" : "100%" }}
        transition={{
          duration: 0.5,
          type: "spring",
          bounce: 0.3,
        }}
        className="flex min-h-screen w-full flex-col items-center-safe justify-center-safe py-8"
        id="motion-container"
      >
        <ComponentView key={isRefreshing} />
      </motion.div>

      <Link
        href="http://localhost:3000/settings"
        className={cn(
          "bg-muted fixed top-4 left-4 z-100 rounded-xl border p-3 pr-8",
          isToggleElements && "hidden"
        )}
      >
        <UserProfile />
      </Link>

      <div
        className={cn(
          "fixed top-4 right-4 z-100",
          isToggleElements && "hidden"
        )}
      >
        <div className="relative z-10 flex flex-row-reverse gap-2">
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
              <TooltipTrigger asChild>
                <ShortcutsDialog>
                  <Button size="icon-lg" variant="outline">
                    <SquareCommand className="size-5.5" />
                  </Button>
                </ShortcutsDialog>
              </TooltipTrigger>
              <TooltipContent>
                <KbdGroup>
                  <Kbd>k</Kbd> <span>Keyboard Shortcuts</span>
                </KbdGroup>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <AnimatePresence>{isOpen && <SourceCode />}</AnimatePresence>
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
