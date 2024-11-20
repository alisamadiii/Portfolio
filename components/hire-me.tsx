"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePathname } from "next/navigation";

type Props = {};

export default function HireMe({}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setTimeout(() => {
      setIsOpen(true);
    }, 1000);
  }, []);

  if (pathname === "/volleyball") {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed bottom-0 left-0 isolate z-50 flex h-12 w-full items-center justify-center">
          <motion.div
            className="absolute -z-10 h-[300px] w-full"
            initial={{ y: 300 }}
            animate={{ y: 0 }}
            transition={{ duration: 1, type: "spring", bounce: 0 }}
          >
            <div id="background-blur"></div>
          </motion.div>
          <motion.div
            className="text-sm font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.7 }}
          >
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href="https://cal.com/alisamadi"
                    target="_blank"
                    className="underline"
                  >
                    cal.com/alisamadi
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Book a call with me</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
