import React, { useState } from "react";

import { BiDotsVerticalRounded } from "react-icons/bi";
import { ProjectType } from "@/contents/Projects";
import DropDown_List from "./DropDown_List";
import { AnimatePresence, motion } from "framer-motion";
import Review_Project from "./Review_Project";
import Image from "next/image";

type Props = {
  project: ProjectType;
};

export default function Project({ project }: Props) {
  const [isHovered, setHovered] = useState<boolean>(false);
  const [data, setData] = useState<null | ProjectType>(null);

  return (
    <div
      className="relative w-full overflow-hidden bg-center bg-cover border isolate group h-96 bg-slate-400 rounded-xl shadow-container"
      style={{ backgroundImage: `url(${project.image})` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <AnimatePresence>
        {isHovered && (
          <div className="relative flex flex-col justify-end w-full h-full gap-1 p-4 isolate">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-t from-white from-5% to-transparent to-50% -z-20"
            />
            <motion.h2
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0, transition: { type: "spring" } }}
              exit={{ opacity: 0, x: -10 }}
              className="text-lg font-medium"
            >
              {project.name}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{
                opacity: 1,
                x: 0,
                transition: { type: "spring", delay: 0.05 },
              }}
              exit={{ opacity: 0, x: -10 }}
              className="text-sm"
            >
              {project.description}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{
                opacity: 1,
                x: 0,
                transition: { type: "spring", delay: 0.08 },
              }}
              exit={{ opacity: 0, x: -10 }}
              className="flex gap-2 mt-2"
            >
              {project.links.map((link, index) => {
                const Icon = link.icon;

                return (
                  <a
                    key={index}
                    href={link.href}
                    target="_blank"
                    className="flex items-center p-2 text-xl duration-200 rounded-md bg-light-blue-2 hover:bg-dark-blue hover:text-light-blue-2"
                  >
                    <Icon />
                  </a>
                );
              })}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
