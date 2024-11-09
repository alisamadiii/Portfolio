"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { cn } from "@/lib/utils";

const numbers: [15, 25] = [15, 25];

export default function VolleyballCount() {
  const [target, setTarget] = useState<15 | 25>(25);

  const [winner, setWinner] = useState<null | "red" | "blue">(null);
  const [count, setCount] = useState({
    red: 0,
    blue: 0,
  });
  const [clicked, setClicked] = useState<null | "red" | "blue">(null);

  const [history, setHistory] = useState<Array<{ red: number; blue: number }>>(
    []
  );

  const handleScore = (team: "red" | "blue") => {
    if (winner !== null) return;
    setHistory([...history, { ...count }]);
    setCount((prev) => ({
      ...prev,
      [team]: prev[team] + 1,
    }));
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previousScore = history[history.length - 1];
    setCount(previousScore);
    setHistory(history.slice(0, -1));
    setWinner(null);
  };

  useEffect(() => {
    if (count.red >= target && count.red - count.blue >= 2) {
      setWinner("red");
    } else if (count.blue >= target && count.blue - count.red >= 2) {
      setWinner("blue");
    }
  }, [count]);

  return (
    <div
      className={cn(
        "relative grid h-dvh w-screen grid-cols-2 justify-center overflow-hidden",
        winner && "grid-cols-1"
      )}
    >
      <MotionConfig transition={{ duration: 0.5, type: "spring", bounce: 0 }}>
        <AnimatePresence mode="popLayout">
          {winner === "red" || winner === null ? (
            <motion.button
              key="red"
              layout
              exit={{
                opacity: 0,
                zIndex: 1,
                transition: { zIndex: { delay: 0.5 } },
              }}
              className={cn(
                "flex items-center justify-center bg-red-500 text-[10rem] font-bold text-white transition-opacity duration-100",
                clicked !== "red" && clicked !== null && "opacity-50"
              )}
              onClick={() => {
                handleScore("red");
                setClicked("red");
              }}
              disabled={winner !== null}
            >
              <motion.span layout className="inline-block w-full max-w-[300px]">
                {count.red}
              </motion.span>
            </motion.button>
          ) : null}

          {winner === "blue" || winner === null ? (
            <motion.button
              key="blue"
              layout
              exit={{ opacity: 0, zIndex: -1 }}
              className={cn(
                "relative flex items-center justify-center bg-blue-500 text-[10rem] font-bold text-white transition-opacity duration-100",
                winner === "blue" && "z-20",
                clicked !== "blue" && clicked !== null && "opacity-50"
              )}
              onClick={() => {
                handleScore("blue");
                setClicked("blue");
              }}
              disabled={winner !== null}
            >
              <motion.span layout className="inline-block w-full max-w-[300px]">
                {count.blue}
              </motion.span>
            </motion.button>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {history.length > 0 && !winner && (
            <motion.button
              initial={{ opacity: 0, y: 100, x: "-50%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="absolute bottom-4 left-1/2 z-10 h-12 rounded-md bg-white px-6 text-lg"
              onClick={handleUndo}
            >
              Undo
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {winner && (
            <motion.button
              initial={{ opacity: 0, y: 100, x: "-50%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="absolute bottom-4 left-1/2 z-30 h-12 rounded-md bg-white px-6 text-lg"
              onClick={() => {
                setCount({ red: 0, blue: 0 });
                setWinner(null);
                setHistory([]);
                setClicked(null);
              }}
            >
              Restart
            </motion.button>
          )}
        </AnimatePresence>

        <div className="absolute left-1/2 top-4 isolate z-30 -translate-x-1/2 overflow-hidden rounded-full bg-white p-1">
          {numbers.map((t) => (
            <button
              key={t}
              className={cn("relative h-8 rounded-md px-4 text-lg font-medium")}
              onClick={() => {
                setTarget(t);
              }}
            >
              {t}

              {t === target && (
                <motion.div
                  layoutId="target"
                  className="absolute inset-0 -z-10 rounded-full border bg-natural-300/40"
                />
              )}
            </button>
          ))}
        </div>
      </MotionConfig>
    </div>
  );
}
