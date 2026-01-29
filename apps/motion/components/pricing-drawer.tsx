import React, { useState } from "react";

import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@workspace/ui/components/drawer";

import { Pricing } from "./pricing";

export const PricingDrawer = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger>{children}</DrawerTrigger>
      <DrawerContent
        overlayClassName="z-100 bg-black"
        className="rounded-t-5xl! shadow-dialog z-100 mx-auto max-w-3xl px-8 pb-8"
      >
        <Pricing />
      </DrawerContent>
    </Drawer>
  );
};
