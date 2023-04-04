import React, { useState } from "react";

import { BiDotsVerticalRounded } from "react-icons/bi";
import { ProjectType } from "@/contents/Projects";
import DropDown_List from "./DropDown_List";
import { AnimatePresence, motion } from "framer-motion";
import Review_Project from "./Review_Project";

type Props = {
  project: ProjectType;
};

export default function Project({ project }: Props) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [data, setData] = useState<null | ProjectType>(null);

  return (
    <>
      <div
        className="relative px-4 py-6 bg-white rounded-xl shadow-container"
        onMouseEnter={() => setData(project)}
        onMouseLeave={() => setData(null)}
      >
        <div className="flex items-center justify-between text-2xl font-bold">
          <h3>{project.name}</h3>
          <div>
            <span onClick={() => setIsOpen(!isOpen)} className="inline-block">
              <BiDotsVerticalRounded />
            </span>
            <AnimatePresence>
              {isOpen && (
                <>
                  <DropDown_List
                    data={project.links}
                    className="absolute hidden w-48 translate-y-2 md:block right-4"
                  />
                  <Review_Project
                    key={project.id}
                    data={project.links}
                    image={project.image}
                    setIsOpen={setIsOpen}
                  />
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
        <p className="mt-2 font-medium">{project.description}</p>
      </div>
      <AnimatePresence>
        {data && <Project_Image image={data.image} />}
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
