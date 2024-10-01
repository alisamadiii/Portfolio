import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";

export default function Helping() {
  const [isOpen, setIsOpen] = useState(false);

  const springTransition = { duration: 0.7, type: "spring", bounce: 0 };

  const customTrigger = (
    <motion.div
      key="trigger"
      layoutId="customModal"
      transition={springTransition}
    >
      <Button variant="secondary" onClick={() => setIsOpen(true)}>
        Open Overlay
      </Button>
    </motion.div>
  );

  return (
    <div className="flex flex-col gap-4">
      {customTrigger}

      <AnimatePresence>
        {isOpen && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogPortal forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50"
              ></motion.div>
              <DialogContent className="border-none bg-transparent p-0 duration-0">
                <motion.div
                  key="modal"
                  layoutId="customModal"
                  transition={springTransition}
                  className="rounded-lg border bg-white p-4 shadow-lg dark:bg-slate-950 sm:rounded-lg"
                >
                  <DialogHeader>
                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                    <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </DialogClose>
                    <DialogDescription>
                      This action cannot be undone. Are you sure you want to
                      permanently delete this file from our servers?
                    </DialogDescription>
                  </DialogHeader>
                </motion.div>
              </DialogContent>
            </DialogPortal>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
