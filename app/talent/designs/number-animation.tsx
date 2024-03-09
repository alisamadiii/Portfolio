import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

const randNumber = [
  Math.floor(Math.random() * 10),
  Math.floor(Math.random() * 10),
  Math.floor(Math.random() * 10),
  Math.floor(Math.random() * 10),
  Math.floor(Math.random() * 10),
  Math.floor(Math.random() * 10),
];

export default function NumberAnimation() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [explode, setExplode] = useState(false);

  useEffect(() => {
    if (currentIndex === 5) {
      setTimeout(() => {
        setExplode(true);
      }, 400);
      return;
    }

    const internal = setInterval(() => {
      setCurrentIndex(currentIndex + 1);
    }, 500);

    return () => {
      clearInterval(internal);
    };
  }, [currentIndex]);

  return (
    <div className="flex h-96 w-full max-w-lg items-center justify-center gap-3 rounded-3xl bg-[rgba(33,33,38)]">
      {randNumber.map((num, index) => (
        <div key={index} className="relative">
          <div className="custom_shadow flex h-10 w-8 items-center justify-center rounded-md bg-[rgba(19,19,22)]">
            {index <= currentIndex && (
              <motion.p
                initial={{ y: 2, opacity: 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-white"
              >
                {num}
              </motion.p>
            )}
          </div>
          {index === currentIndex && !explode && (
            <motion.div
              layoutId="number-animation"
              initial={{ scale: 2 }}
              animate={{ scale: 1 }}
              transition={{
                duration: 0.4,
                type: "spring",
              }}
              className="absolute inset-0 flex justify-center rounded-md border-2 border-cyan-600/50 bg-cyan-500/10"
            >
              <div className="absolute bottom-0.5 h-px w-1/2 bg-cyan-600"></div>
            </motion.div>
          )}
          {explode && (
            <motion.div
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{
                duration: 0.3,
                type: "tween",
              }}
              className="absolute inset-0 flex justify-center rounded-md border-2 border-cyan-600/50 bg-cyan-500/10"
            >
              <div className="absolute bottom-0.5 h-px w-1/2 bg-cyan-600"></div>
            </motion.div>
          )}
        </div>
      ))}
    </div>
  );
}
