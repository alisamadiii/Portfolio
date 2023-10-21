import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { Text, textVariants } from "./ui/text";
import { BsArrowRightShort } from "react-icons/bs";
import { ProjectInformation } from "@/lib/animation";
import { Button } from "./ui/button";
import Video from "./video";

interface Props {
  project: {
    id: number;
    name: string;
    description: string;
    site: string;
    video_url: null | string;
  };
}

export default function Project({ project }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.li className="border-b">
      <button
        className={textVariants({
          className: `group flex w-full cursor-pointer items-center justify-between text-2xl duration-200 hover:text-white max-md:py-4 md:p-4 md:text-4xl ${
            isOpen && "text-white"
          }`,
        })}
        title="open"
        onClick={() => {
          setIsOpen(!isOpen);
        }}
      >
        {project.name}
        <BsArrowRightShort
          className={`text-3xl duration-200 ease-linear group-hover:-translate-x-2 ${
            isOpen && "rotate-90"
          }`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.article
            variants={ProjectInformation}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: "tween" }}
              className="space-y-3 max-md:pb-4 md:p-4 md:pt-0"
            >
              <Text>{project.description}</Text>
              <Button>
                <a href={project.site} target="_blank" rel="noreferrer">
                  Visit
                </a>
              </Button>

              {project.video_url && <Video videoUrl={project.video_url} />}
            </motion.div>
          </motion.article>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
