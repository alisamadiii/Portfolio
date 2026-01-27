import * as Portal from "@radix-ui/react-portal";
import { AnimatePresence, motion, MotionConfig } from "motion/react";

import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";

interface Props {
  active: boolean;
  name?: string;
  className?: string;
}

export const PageLoading = ({ name, active, className }: Props) => {
  return (
    <MotionConfig transition={{ duration: 0.1 }}>
      <AnimatePresence>
        {active && (
          <Portal.Root
            className={cn(
              "fixed inset-0 isolate z-1000 flex h-full w-full max-w-none items-center justify-center",
              className
            )}
          >
            <motion.div
              exit={{ opacity: 0 }}
              className="absolute inset-0 -z-10 bg-black/20 backdrop-blur-[1px]"
            ></motion.div>
            <LoadingSpinnerContent name={name} />
          </Portal.Root>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
};

export function LoadingSpinnerContent({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) {
  return (
    <motion.div
      exit={{ opacity: 0 }}
      className={cn(
        "flex h-[110px] w-[110px] flex-col items-center justify-center gap-2 rounded-[28px] shadow-[0px_4.667px_27.9px_0px_rgba(0,0,0,0.14)] md:h-[131px] md:w-[131px] [&_.close-btn]:hidden",
        "bg-white text-black",
        "dark:max-md:bg-[#1E1E1E] dark:max-md:text-white",
        className
      )}
    >
      <Spinner className="size-10" />
      <AnimatePresence initial={false} mode="popLayout">
        {name && (
          <motion.span
            key={name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-muted-foreground text-center text-sm font-medium tracking-[-0.018rem]"
          >
            {name}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
