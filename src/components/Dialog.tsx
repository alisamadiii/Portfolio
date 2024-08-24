import React from "react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/utils";
import { useElementsOpening } from "@/context/useElementOpening";

interface props {
  children: React.ReactNode;
  className?: string;
}

interface Id extends props {
  id: string;
}

export function Wrapper({ children, className }: props) {
  return <div className={cn("", className)}>{children}</div>;
}

export function Button({ children, className, id }: Id) {
  const { setCurrentOpen } = useElementsOpening();

  return (
    <button
      className={cn("flex items-center justify-center", className)}
      onClick={() => setCurrentOpen(id)}
    >
      {children}
    </button>
  );
}

export function Dialog({ children, className, id }: Id) {
  const { currentOpen, setCurrentOpen } = useElementsOpening();

  return (
    <AnimatePresence>
      {currentOpen === id && (
        <dialog
          id={id}
          className={cn(
            "fixed left-0 top-0 isolate z-[9999] flex h-dvh w-full flex-col items-center justify-center bg-transparent",
            className
          )}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: "var(--opacity-exit)" }}
            className="absolute inset-0 -z-10 bg-white/80 backdrop-blur-sm max-md:[--opacity-exit:0]"
            onClick={() => setCurrentOpen(null)}
          />
          {children}
        </dialog>
      )}
    </AnimatePresence>
  );
}

export function Content({ children, className }: props) {
  return (
    <motion.div
      initial={{
        y: "var(--y-from)",
        x: "var(--x-from)",
      }}
      animate={{
        y: "var(--y-to)",
        x: "var(--x-to)",
      }}
      exit={{
        x: "var(--x-from)",
      }}
      className={cn(
        "relative h-full w-full overflow-auto rounded-xl bg-white shadow-md [--x-from:100%] [--x-to:0px] [--y-from:0px] [--y-to:0px] md:h-auto md:max-h-[90dvh] md:max-w-xl md:pb-8 md:[--x-from:0px] md:[--y-from:20px] md:[--y-to:0px]",
        className
      )}
      transition={{ duration: 0.5, type: "spring", bounce: 0 }}
    >
      {children}
    </motion.div>
  );
}
