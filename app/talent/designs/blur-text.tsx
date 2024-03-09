import React, { useState } from "react";
import { motion } from "framer-motion";

export default function BlurText() {
  const [isHover, setIsHover] = useState(false);

  const onMouseEnter = () => setIsHover(true);
  const onMouseLeave = () => setIsHover(false);

  console.log(isHover);

  return (
    <ul
      className="flex h-96 w-full max-w-lg flex-col items-center justify-center divide-y divide-white/5 rounded-xl bg-[rgba(33,33,38)] text-white"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <li
        className={`relative flex w-full max-w-xs py-1 font-light text-[rgb(147,148,161)] ${
          isHover ? "justify-start" : "justify-center"
        }`}
      >
        <motion.p
          layout
          transition={{
            layout: { delay: 0, type: "tween", ease: "backOut", duration: 0.4 },
          }}
        >
          Device
        </motion.p>
        {isHover && (
          <motion.p
            initial={{ filter: "blur(20px)" }}
            animate={{ filter: "blur(0px)" }}
            transition={{ delay: 0 }}
            className="absolute left-0 translate-x-24 font-medium text-white"
          >
            MacBook Pro
          </motion.p>
        )}
      </li>
      <li
        className={`relative flex w-full max-w-xs py-1 font-light text-[rgb(147,148,161)] ${
          isHover ? "justify-start" : "justify-center"
        }`}
      >
        <motion.p
          layout
          transition={{
            layout: {
              delay: 0.03,
              type: "tween",
              ease: "backOut",
              duration: 0.4,
            },
          }}
        >
          Browser
        </motion.p>
        {isHover && (
          <motion.p
            initial={{ filter: "blur(20px)" }}
            animate={{ filter: "blur(0px)" }}
            className="absolute left-0 translate-x-24 font-medium text-white"
            transition={{ delay: 0.03 }}
          >
            Chrome
          </motion.p>
        )}
      </li>
      <li
        className={`relative flex w-full max-w-xs py-1 font-light text-[rgb(147,148,161)] ${
          isHover ? "justify-start" : "justify-center"
        }`}
      >
        <motion.p
          layout
          transition={{
            layout: {
              delay: 0.05,
              type: "tween",
              ease: "backOut",
              duration: 0.4,
            },
          }}
        >
          Location
        </motion.p>
        {isHover && (
          <motion.p
            initial={{ filter: "blur(20px)" }}
            animate={{ filter: "blur(0px)" }}
            transition={{ delay: 0.06 }}
            className="absolute left-0 translate-x-24 font-medium text-white"
          >
            San Francisco, CA
          </motion.p>
        )}
      </li>
    </ul>
  );
}

/**
 *         {isHover && (
          <motion.p
            initial={{ filter: "blur(20px)" }}
            animate={{ filter: "blur(0px)" }}
          >
            Device
          </motion.p>
        )}
 */
