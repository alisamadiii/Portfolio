import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function Ring() {
  const [isSilent, setIsSilent] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setIsSilent((s) => !s);
    }, 2000);

    return () => clearTimeout(id);
  }, [isSilent]);

  return (
    <motion.div
      animate={{ width: isSilent ? 148 : 128 }}
      transition={{ type: "spring", bounce: 0.5 }}
      className="relative isolate flex h-7 items-center justify-between px-2.5 text-white"
    >
      <AnimatePresence>
        {isSilent ? (
          <motion.div
            initial={{ width: 0, opacity: 0, filter: "blur(4px)" }}
            animate={{
              width: 40,
              opacity: 1,
              filter: "blur(0px)",
            }}
            exit={{ width: 0, opacity: 0, filter: "blur(4px)" }}
            transition={{ type: "spring", bounce: 0.35 }}
            className="absolute left-[5px] -z-10 h-[18px] w-10 rounded-full bg-[#FD4F30]"
          />
        ) : null}
      </AnimatePresence>
      <motion.svg
        width="13"
        height="13"
        viewBox="0 0 13 13"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={{
          x: isSilent ? 9 : 0,
        }}
      >
        <motion.path
          d="M1.8667 9.98438H11.1538C11.7046 9.98438 12.0386 9.70313 12.0386 9.2754C12.0386 8.68943 11.4409 8.1621 10.937 7.64062C10.5503 7.23633 10.4448 6.40429 10.398 5.73046C10.3569 3.48046 9.75926 1.93359 8.20068 1.37109C7.97802 0.603516 7.37451 0 6.50733 0C5.646 0 5.03662 0.603516 4.81983 1.37109C3.26123 1.93359 2.66358 3.48046 2.62256 5.73046C2.57568 6.40429 2.47022 7.23633 2.0835 7.64062C1.57373 8.1621 0.981934 8.68943 0.981934 9.2754C0.981934 9.70313 1.31006 9.98438 1.8667 9.98438ZM6.51025 10.7871C7.50634 10.7871 7.059 10.7871 8.30615 10.7871H6.51025H4.71435C6.32355 10.7871 5.52002 10.7871 6.51025 10.7871Z"
          fill="white"
          animate={{
            rotate: isSilent
              ? [0, -15, 5, -2, 0]
              : [0, 20, -15, 12.5, -10, 10, -7.5, 7.5, -5, 5, 0],
          }}
        />
        <motion.path
          d="M8.30371 10.7871C8.30371 10.9903 8.25732 11.1915 8.16719 11.3793C8.07706 11.567 7.94496 11.7376 7.77842 11.8813C7.61188 12.0249 7.41417 12.1389 7.19658 12.2167C6.97899 12.2944 6.74577 12.3345 6.51025 12.3345C6.27473 12.3345 6.04152 12.2944 5.82393 12.2167C5.60634 12.1389 5.40863 12.0249 5.24209 11.8813C5.07555 11.7376 4.94345 11.567 4.85332 11.3793C4.76319 11.1915 4.7168 10.9903 4.7168 10.7871L6.51025 10.7871H8.30371Z"
          fill="white"
          animate={{
            rotate: isSilent
              ? [0, -15, 5, -2, 0]
              : [0, 20, -15, 12.5, -10, 10, -7.5, 7.5, -5, 5, 0],
            x: isSilent ? 0 : [0, -2.4, 2.4, -2.4, 0],
          }}
        />
      </motion.svg>
      <div className="ml-auto flex items-center">
        {isSilent ? (
          <span className="text-xs font-medium text-[#FD4F30]">Silent</span>
        ) : (
          <span className="text-xs font-medium text-white">Ring</span>
        )}
      </div>
    </motion.div>
  );
}
