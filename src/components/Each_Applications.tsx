import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  app: {
    app: number;
    name: string;
    img: string;
    useCase: string[];
  };
};

export default function Each_Applications({ app }: Props) {
  const [isHovered, setIsHovered] = useState<boolean>(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1, delay: app.app * 0.05, ease: "easeInOut" }}
      key={app.app}
      className="relative py-6 basis-[150px] grow flex flex-col justify-center items-center shadow-lg rounded-xl border overflow-hidden group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img
        src={app.img}
        className="object-contain w-12 h-12 mix-blend-multiply"
        alt=""
      />
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                {uses}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
      <div className="absolute inset-0 duration-200 opacity-0 bg-gradient-to-tr from-primary to-secondary group-hover:opacity-20 -z-20"></div>
      {app.app == 1 && (
        <div className="absolute w-24 h-24 rounded-full bg-light-blue animate-hoverMe"></div>
      )}
    </motion.div>
  );
}
