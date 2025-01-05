import React, { useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const ButtonMotion = motion(Button);

export default function Works21() {
  const [isDateOpen, setIsDateOpen] = useState(false);

  return (
    <MotionConfig transition={{ duration: 0.5, type: "spring", bounce: 0.25 }}>
      <div className="h-[200px]">
        <div className="relative z-10 w-[250px] overflow-hidden rounded-2xl border bg-white">
          <Textarea
            placeholder="What's up?"
            className="min-h-[40px] resize-none border-none bg-transparent placeholder:text-neutral-400"
          />
          <div className="flex h-6 items-center px-2">
            <AnimatePresence>
              {isDateOpen && (
                <motion.div
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "100%", opacity: 0 }}
                  className="flex h-full w-full justify-between overflow-hidden rounded-full bg-neutral-100"
                >
                  <div className="grid grow grid-cols-2 overflow-hidden rounded-full border">
                    <div className="flex items-center justify-center border-r bg-white text-xs text-neutral-400">
                      6, Jan 2025
                    </div>
                    <div className="flex items-center justify-center bg-white text-xs text-neutral-400">
                      4:00 PM
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-4 w-6 text-neutral-400"
                      onClick={() => setIsDateOpen(false)}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="relative z-10 flex items-center justify-end gap-2 p-2">
            <div className="relative flex items-center gap-2">
              <ButtonMotion
                layoutId="schedule-button"
                size="icon"
                variant="outline"
                className="size-7"
                style={{ borderRadius: 14 }}
                onClick={() => setIsDateOpen(!isDateOpen)}
              >
                <motion.span layout className="inline-block">
                  <CalendarDays size={14} />
                </motion.span>
              </ButtonMotion>
              <ButtonMotion
                animate={{ opacity: isDateOpen ? 0 : 1 }}
                transition={!isDateOpen ? { duration: 0.5, delay: 0.1 } : {}}
                size="sm"
                className="h-7 rounded-full px-4 text-sm text-neutral-200"
              >
                Post
              </ButtonMotion>
            </div>

            {isDateOpen && (
              <ButtonMotion
                layoutId="schedule-button"
                size="sm"
                className="absolute h-7 w-[calc(100%-16px)] text-sm text-neutral-200"
                style={{ borderRadius: 16 }}
                onClick={() => setIsDateOpen(false)}
              >
                <motion.span layout className="inline-block">
                  Schedule
                </motion.span>
              </ButtonMotion>
            )}
          </div>
        </div>
        <AnimatePresence>
          {isDateOpen && (
            <motion.div
              initial={{ y: "-100%" }}
              animate={{ y: -16 }}
              exit={{ y: "-100%" }}
              className="flex h-12 items-end justify-center gap-2 rounded-b-2xl border border-t-0 bg-neutral-100 p-2 text-xs text-neutral-400"
            >
              Will be posted on 6 Jan 2025
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
