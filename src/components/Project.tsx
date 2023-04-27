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
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [data, setData] = useState<null | ProjectType>(null);

  return (
    <>
      <motion.div
        layoutId={project.id.toString()}
        // transition={{ delay: 1 }}
        className="px-4 py-6 bg-white rounded-xl shadow-container"
        onMouseEnter={() => setData(project)}
        onMouseLeave={() => setData(null)}
      >
        <div className="flex items-center justify-between text-2xl font-bold">
          <h3>{project.name}</h3>
          <div>
            <span onClick={() => setIsOpen(true)} className="inline-block">
              <BiDotsVerticalRounded />
            </span>
          </div>
        </div>
        <p className="mt-2 font-medium">{project.description}</p>
      </motion.div>
      <AnimatePresence mode="wait">
        {isOpen && <Each_Projects project={project} setIsOpen={setIsOpen} />}
      </AnimatePresence>
    </>
  );
}

type Image_Props = {
  image: string;
};

export function Project_Image({ image }: Image_Props) {
  return (
    <motion.div className="fixed z-50 hidden p-2 overflow-hidden bg-white rounded-md md:block right-4 bottom-4">
      <motion.img
        initial={{ height: 0, scale: 2, opacity: 0 }}
        animate={{
          height: "auto",
          scale: 1,
          opacity: 1,
          transition: { scale: { duration: 0.5 } },
        }}
        exit={{ height: 0 }}
        src={image}
        width={400}
        height={300}
        alt=""
        className="object-cover rounded-md aspect-video"
      />
    </motion.div>
  );
}

type EachProjectsProps = {
  project: ProjectType;
  setIsOpen: (a: boolean) => void;
};

export const Each_Projects = ({ project, setIsOpen }: EachProjectsProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-between font-bold isolate">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute top-0 left-0 w-full h-full bg-white/50 -z-10"
        onClick={() => setIsOpen(false)}
      ></motion.div>
      <motion.div
        layoutId={project.id.toString()}
        layout
        className="p-4 mx-auto bg-white shadow-lg rounded-xl"
        style={{ width: "100%", maxWidth: "700px" }}
      >
        <h3 className="text-2xl">{project.name}</h3>
        <p className="mt-2 font-medium">{project.description}</p>
        <motion.div
          // initial={{ height: "0" }}
          // animate={{ height: "auto" }}
          // exit={{ height: "0" }}
          // transition={{ duration: 0.2, type: "tween", delay: 0.2 }}
          className="overflow-hidden"
        >
          <Image
            src={project.image}
            width={1000}
            height={1000}
            alt=""
            className="object-cover aspect-video"
          />
        </motion.div>
      </motion.div>
    </div>
  );
};
