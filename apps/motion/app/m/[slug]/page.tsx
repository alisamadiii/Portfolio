"use client";

import { memo, useState } from "react";
import { useParams } from "next/navigation";
import { animations } from "@/animations/registry";
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
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import {
  Code,
  QuestionMark,
  Refresh,
  SquareCommand,
} from "@workspace/ui/icons";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import { useSettings } from "@/hooks/settings";

import { SourceCode } from "@/components/animation-settings/source-code";
import { LibrariesUsedDialog } from "@/components/libraries-used";
import { ShortcutsDialog } from "@/components/shortcuts-dialog";
import { UserProfile } from "@/components/user-profile";

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
  const animation = animations[slug as keyof typeof animations];

  useHotkeys("r", () => refresh(), [refresh]);
  useHotkeys("v", () => setIsOpen(!isOpen), [isOpen]);
  useHotkeys("b", () => setIsToggleElements(!isToggleElements), [
    isToggleElements,
  ]);
  useHotkeys("s", () => setIsToggleSettings(!isToggleSettings), [
    isToggleSettings,
  ]);
  useHotkeys("d", () => setTheme(theme === "dark" ? "light" : "dark"), [theme]);

  const trpc = useTRPC();
  useQuery(
    trpc.motion.getFiles.queryOptions(
      { sourceId: animation?.id ?? "" },
      { enabled: !!animation?.id }
    )
  );

  if (!animation) {
    return <div>Animation not found</div>;
  }

  return (
    <>
      <motion.div
        initial={{ maxWidth: "100%" }}
        animate={{ maxWidth: isOpen && !isMobile ? "80%" : "100%" }}
        transition={{
          duration: 0.5,
          type: "spring",
          bounce: 0.3,
        }}
        className={cn(
          "flex min-h-screen w-full origin-top flex-col items-center-safe justify-center-safe px-8 py-24 md:py-8"
        )}
        style={{
          transform: `scale(${containerScale})`,
          transition: "transform 0.4s cubic-bezier(0.785, 0.135, 0.15, 0.86)",
        }}
        id="motion-container"
      >
        <ComponentView key={isRefreshing} />
      </motion.div>

      <UserProfile isToggleElements={isToggleElements} />

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
                <LibrariesUsedDialog>
                  <Button size="icon-lg" variant="outline">
                    <QuestionMark className="size-5.5" />
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

            {/* <Popover open={isToggleSettings} onOpenChange={setIsToggleSettings}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button size="icon-lg" variant="outline">
                      <Settings className="size-5.5" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  Use this to configure the animation.
                </TooltipContent>
              </Tooltip>
              <PopoverContent>
                <PopoverHeader>
                  <PopoverTitle>Settings</PopoverTitle>
                  <PopoverDescription>
                    Use this to configure the animation.
                  </PopoverDescription>
                </PopoverHeader>
                <ButtonGroup>
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Button
                      key={index}
                      size="icon-lg"
                      variant={
                        index + 1 === containerScale ? "default" : "outline"
                      }
                      onClick={() => setContainerScale(index + 1)}
                    >
                      <Expand className="size-5.5" />
                    </Button>
                  ))}
                </ButtonGroup>
                <ButtonGroup>
                  {[0.5, 1, 1.5, 2].map((s, index) => (
                    <Button
                      key={index}
                      size="icon-lg"
                      variant={speed === s ? "default" : "outline"}
                      onClick={() => setSpeed(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </ButtonGroup>
              </PopoverContent>
            </Popover> */}
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
