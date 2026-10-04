import React, { useState } from "react";
import { animations } from "@/animations/registry";
import { motion } from "motion/react";
import { createPortal } from "react-dom";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "@workspace/ui/components/drawer";

import { Pricing } from "./pricing";

export const PricingDrawer = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger>{children}</DrawerTrigger>
        <DrawerContent className="rounded-t-5xl! z-102 mx-auto max-w-3xl border-0 bg-transparent pb-8">
          <Pricing />
          <DrawerClose className="mx-auto mt-4 cursor-pointer text-sm font-medium text-white/60 transition-colors hover:text-white">
            Close
          </DrawerClose>
        </DrawerContent>
      </Drawer>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="pointer-events-none fixed inset-0 z-101 bg-black select-none">
            <div className="absolute inset-0 mx-auto w-[1800px] origin-top -translate-y-[20%] scale-150 -skew-x-24 columns-5 mask-b-from-5 opacity-40">
              {Object.values(animations).map((animation, index) => (
                <div key={animation.id} className="mb-4">
                  <motion.img
                    src={animation.darkImage || animation.image}
                    alt={animation.name}
                    className="rounded-2xl"
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.5,
                      delay: index * 0.1,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
