"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@workspace/ui/components/button";
import { Code } from "@workspace/ui/icons";

import { useTRPC } from "@workspace/trpc/client";

import { animations } from "@/lib/animations";

import { SourceCode } from "@/components/animation-settings/source-code";

export default function ComponentPage() {
  const [isOpen, setIsOpen] = useState(false);
  const { slug } = useParams();
  const animation = animations[slug as keyof typeof animations];

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
      >
        <animation.component />
        {/* <ViewComponentWrapper>
        </ViewComponentWrapper> */}
      </motion.div>

      <div className="fixed top-4 right-4 z-100">
        <div className="relative z-10">
          <Button size="icon-lg" onClick={() => setIsOpen(!isOpen)}>
            <Code className="size-5.5" />
          </Button>
        </div>

        <AnimatePresence>{isOpen && <SourceCode />}</AnimatePresence>
      </div>
    </>
  );
}
