import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { DAILY_APPLICATION_Type } from "@/contents/Daily_Applications";

type Props = {
  app: DAILY_APPLICATION_Type;
};

export default function Each_Applications({ app }: Props) {
  const [isHovered, setIsHovered] = useState<boolean>(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: app.app * 0.05, ease: "easeInOut" }}
      key={app.app}
      className="relative py-6 basis-[150px] grow flex flex-col justify-center items-center shadow-lg rounded-xl border overflow-hidden group before:absolute before:inset-0 before:bg-gradient-to-tr before:from-primary before:to-secondary before:opacity-0 hover:before:opacity-20 duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img src={app.img} className="object-contain w-12 h-12" alt={app.name} />
      <h3 className="my-2 font-medium">{app.name}</h3>
      <AnimatePresence>
        {isHovered && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 1 }}
            className="w-full pl-8 overflow-hidden text-sm list-disc"
          >
            {app.useCase.map((uses, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.4 }}
              >
                {uses}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
      {app.app == 1 && (
        <div className="absolute w-24 h-24 rounded-full bg-light-blue animate-hoverMe" />
      )}
    </motion.div>
  );
}
