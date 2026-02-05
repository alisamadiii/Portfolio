import React, { useState } from "react";
import { animations } from "@/animations/registry";
import { Portal } from "@radix-ui/react-portal";
import { motion } from "motion/react";

import {
  Drawer,
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
        <DrawerContent
          overlayClassName="z-100 bg-black"
          className="rounded-t-5xl! shadow-dialog z-102 mx-auto max-w-3xl px-8 pb-8"
        >
          <Pricing />
        </DrawerContent>
      </Drawer>
      {open && (
        <Portal className="fixed inset-0 z-101 mask-b-from-5 opacity-40">
          <div className="absolute inset-0 mx-auto w-[1800px] origin-top -translate-y-[20%] scale-150 -skew-x-24 columns-5">
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
        </Portal>
      )}
    </div>
  );
};
